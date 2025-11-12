package com.vebops.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.function.Predicate;

import com.vebops.service.WorkOrderService;
import com.vebops.service.WorkOrderService.ProgressAttachment;
import com.vebops.service.TenantGuard;
import com.vebops.service.InventoryService;
import com.vebops.service.InvoiceService;
import com.vebops.repository.*;
import com.vebops.domain.*;
import com.vebops.domain.enums.*;
import com.vebops.exception.*;
import com.vebops.util.CodeGenerators;

@Service
public class WorkOrderServiceImpl implements WorkOrderService {

    private final TenantGuard tenantGuard;
    private final InventoryService inventoryService;
    private final InvoiceService invoiceService;

    private final WorkOrderRepository woRepo;
    private final ServiceRequestRepository srRepo;
    private final FieldEngineerRepository feRepo;
    private final WorkOrderItemRepository woItemRepo;
    private final KitItemRepository kitItemRepo;
    private final WorkOrderProgressRepository woProgRepo;
    private final WorkOrderAssignmentRepository woAssignRepo;
    private final WorkOrderProgressAttachmentRepository woProgAttachmentRepo;

    // Repository for linking the most recent customer purchase order to a work order
    private final CustomerPORepository customerPORepo;

    private static final long MAX_PROGRESS_ATTACHMENT_BYTES = 8L * 1024 * 1024;

    public WorkOrderServiceImpl(
        TenantGuard tenantGuard,
        InventoryService inventoryService,
        InvoiceService invoiceService,
        WorkOrderRepository woRepo,
        ServiceRequestRepository srRepo,
        FieldEngineerRepository feRepo,
        WorkOrderItemRepository woItemRepo,
        KitItemRepository kitItemRepo,
        WorkOrderProgressRepository woProgRepo,
        CustomerPORepository customerPORepo,
        WorkOrderAssignmentRepository woAssignRepo,
        WorkOrderProgressAttachmentRepository woProgAttachmentRepo
    ) {
        this.tenantGuard = tenantGuard;
        this.inventoryService = inventoryService;
        this.invoiceService = invoiceService;
        this.woRepo = woRepo;
        this.srRepo = srRepo;
        this.feRepo = feRepo;
        this.woItemRepo = woItemRepo;
        this.kitItemRepo = kitItemRepo;
        this.woProgRepo = woProgRepo;
        this.customerPORepo = customerPORepo;
        this.woAssignRepo = woAssignRepo;
        this.woProgAttachmentRepo = woProgAttachmentRepo;
    }

    @Override
    @Transactional(noRollbackFor = InsufficientStockException.class)
    public WorkOrder createForServiceRequest(Long tenantId, Long srId) {
        tenantGuard.assertActive(tenantId);
        var existing = woRepo.findByTenantIdAndServiceRequest_Id(tenantId, srId);
        if (existing != null && !existing.isEmpty()) {
            return existing.get(0);
        }
        ServiceRequest sr = srRepo.findById(srId).orElseThrow(() -> new NotFoundException("SR not found"));
        if (!tenantId.equals(sr.getTenantId())) throw new BusinessException("Cross-tenant access");
        // Require an approved proposal only for supply service types
        boolean requiresProposal = sr.getServiceType() == ServiceTypeCode.SUPPLY
            || sr.getServiceType() == ServiceTypeCode.SUPPLY_INSTALL;
        if (requiresProposal) {
            if (sr.getProposal() == null) {
                throw new BusinessException("Proposal required for SUPPLY/SUPPLY_INSTALL service types");
            }
            if (sr.getProposal().getStatus() != ProposalStatus.APPROVED) {
                throw new BusinessException("SR Proposal must be APPROVED for SUPPLY-related jobs");
            }
        }
        WorkOrder wo = new WorkOrder();
        wo.setTenantId(tenantId);
        wo.setServiceRequest(sr);
        wo.setStatus(WOStatus.NEW);

        // Attempt to associate the most recent customer purchase order to this work order. If the SR
        // originates from a proposal that has any uploaded customer purchase orders, link the latest
        // one by upload timestamp. This allows downstream workflows such as invoicing and
        // reporting to trace the work order back to the associated PO.
        if (sr.getProposal() != null) {
            Long proposalId = sr.getProposal().getId();
            List<CustomerPO> poList = customerPORepo.findByTenantIdAndProposal_Id(tenantId, proposalId);
            if (!poList.isEmpty()) {
                // Choose the latest by uploadedAt; fall back to the last element if timestamps are null
                CustomerPO latest = poList.stream()
                    .max((a,b) -> {
                        if (a.getUploadedAt() == null && b.getUploadedAt() == null) return 0;
                        if (a.getUploadedAt() == null) return -1;
                        if (b.getUploadedAt() == null) return 1;
                        return a.getUploadedAt().compareTo(b.getUploadedAt());
                    }).orElse(poList.get(poList.size() - 1));
                wo.setCustomerPO(latest);
            }
        }

        // Generate WAN (work allocation number) with format WAN-YYMM-####
        Predicate<String> exists = code -> woRepo.findByTenantIdAndWan(tenantId, code).isPresent();
        wo.setWan(CodeGenerators.unique("WAN", exists));
        woRepo.save(wo);

        // Plan items from kit (if any). For non-supply service types the proposal or kit may be null.
        if (sr.getProposal() != null && sr.getProposal().getKit() != null) {
            List<KitItem> kitItems = kitItemRepo.findByTenantIdAndKit_Id(tenantId, sr.getProposal().getKit().getId());
            for (KitItem ki : kitItems) {
                WorkOrderItem woi = new WorkOrderItem();
                woi.setTenantId(tenantId);
                woi.setWorkOrder(wo);
                woi.setItem(ki.getItem());
                woi.setQtyPlanned(ki.getQty());
                woi.setQtyIssued(BigDecimal.ZERO);
                woItemRepo.save(woi);
            }
        }

        boolean supplyJob = sr.getServiceType() == ServiceTypeCode.SUPPLY
                        || sr.getServiceType() == ServiceTypeCode.SUPPLY_INSTALL;
        if (supplyJob) {
            var planned = woItemRepo.findByTenantIdAndWorkOrder_Id(tenantId, wo.getId());
            for (WorkOrderItem it : planned) {
                // This checks across all stores; if shortage, PR is raised and a 409 is thrown.
                inventoryService.ensureStockOrRaiseProcurementAnyStore(tenantId, it.getItem().getId(), it.getQtyPlanned(), wo.getId());
            }
        }

        return wo;
    }

    @Override
    @Transactional
    public void autoAssignIfInstallation(Long tenantId, Long woId) {
        tenantGuard.assertActive(tenantId);
        WorkOrder wo = woRepo.findById(woId).orElseThrow(() -> new NotFoundException("WO not found"));
        ServiceRequest sr = wo.getServiceRequest();
        if (sr.getServiceType() == ServiceTypeCode.SUPPLY_INSTALL || sr.getServiceType() == ServiceTypeCode.INSTALL_ONLY) {
            var available = feRepo.findByTenantIdAndStatus(tenantId, FEStatus.AVAILABLE);
            if (!available.isEmpty()) {
                wo.setAssignedFE(available.get(0));
                wo.setStatus(WOStatus.ASSIGNED);
            }
        }
    }

    @Override
    @Transactional(noRollbackFor = InsufficientStockException.class)
    public void issueItem(Long tenantId, Long woId, Long itemId, Long storeId, BigDecimal qty) {
        // Validate tenant subscription is active.  Even when stock is insufficient and an
        // InsufficientStockException is thrown by the inventory service we do not
        // roll back the surrounding transaction.  The procurement request should still be
        // persisted so that the shortage can be addressed.  The exception will
        // propagate to the caller and be handled by the GlobalExceptionHandler.
        tenantGuard.assertActive(tenantId);

        // Attempt to ensure sufficient stock or raise procurement.  If stock is
        // insufficient, InsufficientStockException will be thrown.  Because of
        // the noRollbackFor attribute on this method and on the inventory
        // service, any newly created procurement request will still be committed.
        inventoryService.ensureStockOrRaiseProcurement(tenantId, itemId, storeId, qty, woId);

        // If we reach this line there is enough stock.  Deduct the quantity and
        // update the issued quantity on any matching work order item.  These
        // operations run in the same transaction and will be committed together.
        inventoryService.deduct(tenantId, itemId, storeId, qty, woId);

        var items = woItemRepo.findByTenantIdAndWorkOrder_Id(tenantId, woId);
        for (WorkOrderItem it : items) {
            if (it.getItem().getId().equals(itemId)) {
                it.setQtyIssued(it.getQtyIssued().add(qty));
            }
        }
    }

    @Override
    @Transactional
    public void addProgress(Long tenantId, Long woId, String status, Long byFeId, String remarks, String photoUrl, ProgressAttachment attachment) {
        tenantGuard.assertActive(tenantId);
        WorkOrder wo = woRepo.findById(woId).orElseThrow(() -> new NotFoundException("WO not found"));
        // Persist a timeline entry for the work order and optionally store a binary
        // attachment. Attachments are stored as BLOBs on the progress entity so
        // the back office can review photo evidence of installation progress.
        // 1) Persist timeline entry
        WorkOrderProgress p = new WorkOrderProgress();
        p.setTenantId(tenantId);
        p.setWorkOrder(wo);
        // Safely map the status string to the enum.  If the provided status
        // does not correspond to any enum constant an IllegalArgumentException
        // will be thrown and propagated to the caller.
        WOProgressStatus progressStatus = WOProgressStatus.valueOf(status);
        p.setStatus(progressStatus);
        Long progressFeId = byFeId;
        if (progressFeId == null && wo.getAssignedFE() != null) {
            progressFeId = wo.getAssignedFE().getId();
        }
        if (progressFeId != null) {
            FieldEngineer fe = feRepo.findById(progressFeId).orElse(null);
            p.setByFE(fe);
        }
        p.setPhotoUrl(photoUrl);
        p.setRemarks(remarks);
        woProgRepo.save(p);

        if (attachment != null && attachment.hasContent()) {
            byte[] data = attachment.data();
            long actualSize = data.length;
            long declared = attachment.size() != null ? attachment.size() : actualSize;
            long effectiveSize = Math.max(actualSize, declared);
            if (effectiveSize > MAX_PROGRESS_ATTACHMENT_BYTES) {
                throw new BusinessException("Progress attachment exceeds the 8 MB limit");
            }
            WorkOrderProgressAttachment photo = new WorkOrderProgressAttachment();
            photo.setTenantId(tenantId);
            photo.setProgress(p);
            photo.setFilename(sanitiseFilename(attachment.filename()));
            photo.setContentType(normaliseContentType(attachment.contentType()));
            photo.setSize(actualSize);
            photo.setData(data);
            woProgAttachmentRepo.save(photo);
            p.addAttachment(photo);
        }

        // Synchronize the higher level WorkOrder status based on progress.  The
        // transitions below follow the FE mobile flow defined in the spec:
        // ASSIGNED → ACCEPTED → STARTED → MATERIAL_RECEIVED → INSTALLATION_STARTED → COMPLETED.
        switch (progressStatus) {
            case ASSIGNED -> {
                wo.setStatus(WOStatus.ASSIGNED);
            }
            case ACCEPTED -> {
                // After acceptance the work order remains in ASSIGNED state until
                // actual work begins (STARTED).  Do not advance to IN_PROGRESS yet.
                wo.setStatus(WOStatus.ASSIGNED);
                // Auto-issue materials to FE’s home store (van) if configured
                FieldEngineer fe = wo.getAssignedFE();
                if (fe != null && fe.getHomeStore() != null) {
                    Long storeId = fe.getHomeStore().getId();
                    List<WorkOrderItem> items = woItemRepo.findByTenantIdAndWorkOrder_Id(tenantId, woId);
                    for (WorkOrderItem it : items) {
                        var toIssue = it.getQtyPlanned().subtract(it.getQtyIssued());
                        if (toIssue.signum() > 0) {
                            // Ensure/raise PR if short, then deduct to FE van store
                            inventoryService.ensureStockOrRaiseProcurement(tenantId,
                                it.getItem().getId(), storeId, toIssue, woId);
                            inventoryService.deduct(tenantId,
                                it.getItem().getId(), storeId, toIssue, woId);
                            it.setQtyIssued(it.getQtyIssued().add(toIssue));
                        }
                    }
                }

            }
            case STARTED -> {
                wo.setStatus(WOStatus.IN_PROGRESS);
            }
            case COMPLETED -> {
                wo.setStatus(WOStatus.COMPLETED);
            }
            default -> {
                // For MATERIAL_RECEIVED and INSTALLATION_STARTED we do not
                // modify the high‑level work order status.
            }
        }
    }

    private String sanitiseFilename(String original) {
        if (original == null || original.trim().isEmpty()) {
            return "progress-photo";
        }
        return original.replaceAll("[\\\\/:*?\"<>|]+", "_");
    }

    private String normaliseContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return "application/octet-stream";
        }
        return contentType;
    }

    @Override
    @Transactional
    public void complete(Long tenantId, Long woId) {
        tenantGuard.assertActive(tenantId);
        WorkOrder wo = woRepo.findById(woId).orElseThrow(() -> new NotFoundException("WO not found"));
        wo.setStatus(WOStatus.COMPLETED);
        Invoice inv =invoiceService.generateForWorkOrder(tenantId, woId);

        // Auto-email to customer (if email present)
        String to = null;
        if (wo.getServiceRequest() != null && wo.getServiceRequest().getCustomer() != null) {
            to = wo.getServiceRequest().getCustomer().getEmail();
        }
        if (to != null && !to.isBlank()) {
            invoiceService.sendInvoice(tenantId, inv.getId(), to);
        }
    }

    @Override
    @Transactional
    public void assignFe(Long tenantId, Long woId, Long feId, String note) {
        tenantGuard.assertActive(tenantId);

        WorkOrder wo = woRepo.findById(woId).orElseThrow(() -> new NotFoundException("WO not found"));
        if (!tenantId.equals(wo.getTenantId())) throw new BusinessException("Cross-tenant access");

        FieldEngineer fe = feRepo.findById(feId).orElseThrow(() -> new NotFoundException("FE not found"));

        // set current assignment & status
        wo.setAssignedFE(fe);
        wo.setStatus(WOStatus.ASSIGNED);

        // record assignment history
        WorkOrderAssignment a = new WorkOrderAssignment();
        a.setTenantId(tenantId);
        a.setWorkOrder(wo);
        a.setFieldEngineer(fe);
        a.setAssignedAt(Instant.now());
        a.setNote(note);
        woAssignRepo.save(a);
    }

    @Override
    @Transactional
    public void returnItem(Long tenantId, Long woId, Long itemId, Long storeId, BigDecimal qty) {
        tenantGuard.assertActive(tenantId);
        WorkOrder wo = woRepo.findById(woId).orElseThrow(() -> new NotFoundException("WO not found"));

        // decrement issued qty but never below zero
        var items = woItemRepo.findByTenantIdAndWorkOrder_Id(tenantId, woId);
        WorkOrderItem match = null;
        for (WorkOrderItem it : items) {
            if (it.getItem().getId().equals(itemId)) { match = it; break; }
        }
        if (match == null) throw new NotFoundException("WO item not found");
        if (match.getQtyIssued().compareTo(qty) < 0) {
            throw new BusinessException("Return qty exceeds issued qty");
        }
        match.setQtyIssued(match.getQtyIssued().subtract(qty));

        // move stock back and write ledger
        inventoryService.returnFromWorkOrder(tenantId, itemId, storeId, qty, woId);
    }


}
