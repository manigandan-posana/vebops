package com.vebops.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.vebops.context.TenantContext;
import com.vebops.domain.FieldEngineer;
import com.vebops.domain.KitItem;
import com.vebops.domain.ServiceRequest;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.domain.WorkOrderProgressAttachment;
import com.vebops.dto.ProgressRequest;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.FieldEngineerRepository;
import com.vebops.repository.KitItemRepository;
import com.vebops.repository.WorkOrderAssignmentRepository;
import com.vebops.repository.WorkOrderItemRepository;
import com.vebops.repository.WorkOrderProgressRepository;
import com.vebops.repository.WorkOrderProgressAttachmentRepository;
import com.vebops.repository.WorkOrderQueryRepository;
import com.vebops.repository.WorkOrderRepository;
import com.vebops.repository.ServiceRepository;
import com.vebops.util.PdfUtil;

/**
 * Service encapsulating field engineer operations originally defined in
 * {@link com.vebops.web.FEController}. Business logic resides here.
 */
@Service
public class FeService {

    private final WorkOrderService workOrders;
    private final WorkOrderQueryRepository woQuery;
    private final WorkOrderRepository woRepo;
    private final WorkOrderProgressRepository woProgressRepo;
    private final WorkOrderItemRepository woItemRepo;
    private final WorkOrderAssignmentRepository woAssignRepo;
    private final FieldEngineerRepository feRepo;
    private final ServiceRepository serviceRepo;
    private final KitItemRepository kitItemRepo;
    private final WorkOrderProgressAttachmentRepository progressAttachmentRepo;

    public FeService(WorkOrderService workOrders,
                     WorkOrderQueryRepository woQuery,
                     WorkOrderRepository woRepo,
                     WorkOrderProgressRepository woProgressRepo,
                     WorkOrderItemRepository woItemRepo,
                     WorkOrderAssignmentRepository woAssignRepo,
                     FieldEngineerRepository feRepo,
                     ServiceRepository serviceRepo,
                     KitItemRepository kitItemRepo,
                     WorkOrderProgressAttachmentRepository progressAttachmentRepo) {
        this.workOrders = workOrders;
        this.woQuery = woQuery;
        this.woRepo = woRepo;
        this.woProgressRepo = woProgressRepo;
        this.woItemRepo = woItemRepo;
        this.woAssignRepo = woAssignRepo;
        this.feRepo = feRepo;
        this.serviceRepo = serviceRepo;
        this.kitItemRepo = kitItemRepo;
        this.progressAttachmentRepo = progressAttachmentRepo;
    }

    private Long tenant() { return TenantContext.getTenantId(); }

    /**
     * Returns a list of work orders assigned to the given field engineer for the current tenant.
     * Touches nested associations to avoid lazy proxy serialization.
     */
    public ResponseEntity<List<WorkOrder>> assigned(Long feId) {
        List<WorkOrder> list = woQuery.findByTenantIdAndAssignedFE_Id(tenant(), feId);
        list.forEach(wo -> {
            if (wo.getServiceRequest() != null) {
                wo.getServiceRequest().getId();
                if (wo.getServiceRequest().getCustomer() != null) {
                    wo.getServiceRequest().getCustomer().getName();
                }
            }
            if (wo.getAssignedFE() != null) {
                wo.getAssignedFE().getId();
                if (wo.getAssignedFE().getUser() != null) {
                    wo.getAssignedFE().getUser().getDisplayName();
                }
            }
            if (wo.getAssignedTeam() != null) {
                wo.getAssignedTeam().getId();
                wo.getAssignedTeam().getName();
            }
            if (wo.getCustomerPO() != null) {
                wo.getCustomerPO().getId();
            }
        });
        return ResponseEntity.ok(list);
    }

    /**
     * Adds a progress entry for the given work order.
     */
    public ResponseEntity<Void> progress(Long woId, ProgressRequest req) {
        Long tid = tenant();
        Long feId = req.byFeId;
        if (feId == null) {
            Long uid = TenantContext.getUserId();
            feId = feRepo.findFirstByTenantIdAndUser_Id(tid, uid)
                .map(FieldEngineer::getId)
                .orElseThrow(() -> new NotFoundException("Field engineer profile not found for user"));
        }
        WorkOrderService.ProgressAttachment attachment;
        try {
            attachment = req.toAttachment();
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ex.getMessage());
        }
        workOrders.addProgress(tid, woId, req.status, feId, req.remarks, req.photoUrl, attachment);
        return ResponseEntity.noContent().build();
    }

    /**
     * Generates a PDF completion report for a work order. Ensures the work order belongs to the tenant and
     * touches nested associations to avoid lazy proxy serialization issues.
     */
    public ResponseEntity<byte[]> completionReport(Long id) {
        Long tid = tenant();
        WorkOrder wo = woRepo.findById(id).orElseThrow(() -> new NotFoundException("Work order not found"));
        if (!tid.equals(wo.getTenantId())) throw new BusinessException("Cross-tenant access");
        // Touch nested associations
        if (wo.getServiceRequest() != null) {
            wo.getServiceRequest().getId();
            if (wo.getServiceRequest().getCustomer() != null) {
                wo.getServiceRequest().getCustomer().getName();
            }
        }
        if (wo.getAssignedFE() != null) {
            wo.getAssignedFE().getId();
            if (wo.getAssignedFE().getUser() != null) {
                wo.getAssignedFE().getUser().getDisplayName();
            }
        }
        if (wo.getAssignedTeam() != null) {
            wo.getAssignedTeam().getId();
            wo.getAssignedTeam().getName();
        }
        if (wo.getCustomerPO() != null) {
            wo.getCustomerPO().getId();
        }
        List<WorkOrderProgress> progress = woProgressRepo.findByTenantIdAndWorkOrder_IdOrderByCreatedAtAsc(tid, id);
        List<Long> progressIds = progress.stream()
            .map(WorkOrderProgress::getId)
            .filter(Objects::nonNull)
            .toList();
        if (!progressIds.isEmpty()) {
            Map<Long, List<WorkOrderProgressAttachment>> attachments = progressAttachmentRepo
                .findByTenantIdAndProgress_IdIn(tid, progressIds)
                .stream()
                .filter(att -> att.getProgress() != null && att.getProgress().getId() != null)
                .collect(Collectors.groupingBy(att -> att.getProgress().getId()));
            progress.forEach(p -> {
                List<WorkOrderProgressAttachment> attList = attachments.get(p.getId());
                if (attList != null) {
                    attList.forEach(p::addAttachment);
                }
            });
        }
        byte[] pdf = PdfUtil.buildCompletionReportPdf(wo, progress);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=completion-report-" + wo.getWan() + ".pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    public ResponseEntity<byte[]> downloadProgressAttachment(Long woId, Long progressId, Long attachmentId) {
        Long tid = tenant();
        Long uid = TenantContext.getUserId();
        var fe = feRepo.findFirstByTenantIdAndUser_Id(tid, uid)
            .orElseThrow(() -> new NotFoundException("Field engineer profile not found for user"));

        WorkOrderProgressAttachment attachment = progressAttachmentRepo
            .findByTenantIdAndId(tid, attachmentId)
            .orElseThrow(() -> new NotFoundException("Attachment not found"));

        WorkOrderProgress progress = attachment.getProgress();
        if (progress == null || progress.getWorkOrder() == null) {
            throw new NotFoundException("Progress entry not found for attachment");
        }
        WorkOrder wo = progress.getWorkOrder();
        if (!tid.equals(wo.getTenantId())) {
            throw new BusinessException("Cross-tenant access");
        }
        if (!woId.equals(wo.getId())) {
            throw new BusinessException("Attachment does not belong to the work order");
        }
        if (!progressId.equals(progress.getId())) {
            throw new BusinessException("Attachment does not belong to the progress entry");
        }
        if (wo.getAssignedFE() == null || wo.getAssignedFE().getId() == null
                || !wo.getAssignedFE().getId().equals(fe.getId())) {
            throw new BusinessException("Work order is not assigned to you");
        }

        byte[] data = attachment.getData();
        if (data == null) {
            data = new byte[0];
        }
        String filename = attachment.getFilename() != null ? attachment.getFilename() : "progress-photo";
        String contentType = attachment.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename.replace("\"", "") + "\"")
            .contentType(MediaType.parseMediaType(contentType))
            .body(data);
    }

    public ResponseEntity<List<WorkOrder>> assignedForCurrentUser() {
        Long tid = tenant();
        Long uid = TenantContext.getUserId();
        var fe = feRepo.findFirstByTenantIdAndUser_Id(tid, uid)
            .orElseThrow(() -> new NotFoundException("Field engineer profile not found for user"));
        return assigned(fe.getId());
    }

    public ResponseEntity<FeWorkOrderDetail> detail(Long woId) {
        Long tid = tenant();
        Long uid = TenantContext.getUserId();
        var fe = feRepo.findFirstByTenantIdAndUser_Id(tid, uid)
            .orElseThrow(() -> new NotFoundException("Field engineer profile not found for user"));

        WorkOrder wo = woRepo.findById(woId).orElseThrow(() -> new NotFoundException("Work order not found"));
        if (!tid.equals(wo.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (wo.getAssignedFE() == null || !wo.getAssignedFE().getId().equals(fe.getId())) {
            throw new BusinessException("Work order is not assigned to you");
        }

        List<com.vebops.domain.WorkOrderItem> items = woItemRepo.findByTenantIdAndWorkOrder_Id(tid, woId);
        List<FeWorkOrderItem> dtoItems = new ArrayList<>();
        items.forEach(it -> {
            if (it.getItem() != null) {
                it.getItem().getName();
                it.getItem().getCode();
                it.getItem().getSpec();
                it.getItem().getHsnSac();
                it.getItem().getUom();
            }
            dtoItems.add(new FeWorkOrderItem(
                it.getId(),
                it.getItem() != null ? it.getItem().getName() : null,
                it.getItem() != null ? it.getItem().getCode() : null,
                it.getItem() != null ? it.getItem().getSpec() : null,
                it.getItem() != null ? it.getItem().getHsnSac() : null,
                it.getItem() != null ? it.getItem().getUom() : null,
                it.getQtyPlanned(),
                it.getQtyIssued()
            ));
        });

        ServiceRequest sr = wo.getServiceRequest();
        Long srId = null;
        String srn = null;
        String serviceType = null;
        String description = null;
        String siteAddress = null;
        String customerName = null;
        String customerEmail = null;
        String customerMobile = null;
        String customerAddress = null;
        if (sr != null) {
            sr.getServiceType();
            sr.getSrn();
            sr.getDescription();
            sr.getSiteAddress();
            srId = sr.getId();
            serviceType = sr.getServiceType() != null ? sr.getServiceType().name() : null;
            srn = sr.getSrn();
            description = sr.getDescription();
            siteAddress = trimToNull(sr.getSiteAddress());
            if (sr.getCustomer() != null) {
                sr.getCustomer().getName();
                sr.getCustomer().getEmail();
                sr.getCustomer().getMobile();
                sr.getCustomer().getAddress();
                customerName = trimToNull(sr.getCustomer().getName());
                customerEmail = trimToNull(sr.getCustomer().getEmail());
                customerMobile = trimToNull(sr.getCustomer().getMobile());
                customerAddress = trimToNull(sr.getCustomer().getAddress());
                if (siteAddress == null) {
                    siteAddress = customerAddress;
                }
            }
        }

        com.vebops.domain.Service linkedService = resolveLinkedService(tid, srId, wo.getId());
        BuyerSummary buyerSummary = deriveBuyerSummary(sr, linkedService);
        ConsigneeSummary consigneeSummary = deriveConsigneeSummary(linkedService);
        if (siteAddress == null && linkedService != null) {
            siteAddress = trimToNull(linkedService.getConsigneeAddress());
        }
        KitSummary kitSummary = deriveKitSummary(tid, sr);
        String customerPoNumber = wo.getCustomerPO() != null ? trimToNull(wo.getCustomerPO().getPoNumber()) : null;
        Long serviceId = linkedService != null ? linkedService.getId() : null;

        ServiceSummary summary = new ServiceSummary(
            srId,
            srn,
            serviceType,
            description,
            siteAddress,
            customerName,
            customerEmail,
            customerMobile,
            customerAddress,
            buyerSummary,
            consigneeSummary,
            kitSummary,
            customerPoNumber,
            serviceId
        );

        List<WorkOrderProgress> progress = woProgressRepo.findByTenantIdAndWorkOrder_IdOrderByCreatedAtAsc(tid, woId);
        Map<Long, List<WorkOrderProgressAttachment>> attachmentsByProgress = Map.of();
        List<Long> progressIds = progress.stream()
                .map(WorkOrderProgress::getId)
                .filter(Objects::nonNull)
                .toList();
        if (!progressIds.isEmpty()) {
            attachmentsByProgress = progressAttachmentRepo
                    .findByTenantIdAndProgress_IdIn(tid, progressIds)
                    .stream()
                    .filter(att -> att.getProgress() != null && att.getProgress().getId() != null)
                    .collect(Collectors.groupingBy(att -> att.getProgress().getId()));
        }
        List<ProgressEntry> progressEntries = new ArrayList<>(progress.size());
        for (WorkOrderProgress p : progress) {
            Instant createdAt = p.getCreatedAt();
            String status = p.getStatus() != null ? p.getStatus().name() : null;
            ProgressUser by = null;
            if (p.getByFE() != null) {
                p.getByFE().getId();
                if (p.getByFE().getUser() != null) {
                    p.getByFE().getUser().getDisplayName();
                }
                String name = p.getByFE().getUser() != null
                        ? p.getByFE().getUser().getDisplayName()
                        : p.getByFE().getName();
                by = new ProgressUser(p.getByFE().getId(), name);
            }
            List<ProgressAttachmentView> attachments = attachmentsByProgress.getOrDefault(p.getId(), List.of())
                    .stream()
                    .map(att -> toAttachmentView(woId, p.getId(), att))
                    .collect(Collectors.toList());
            progressEntries.add(new ProgressEntry(
                p.getId(),
                status,
                p.getRemarks(),
                p.getPhotoUrl(),
                createdAt,
                by,
                attachments
            ));
        }

        var assignment = woAssignRepo.findByTenantIdAndWorkOrder_IdOrderByAssignedAtDesc(tid, woId)
                .stream().findFirst().orElse(null);
        String instruction = assignment != null ? assignment.getNote() : null;

        return ResponseEntity.ok(new FeWorkOrderDetail(
            wo,
            instruction,
            dtoItems,
            summary,
            progressEntries
        ));
    }

    private BuyerSummary deriveBuyerSummary(ServiceRequest sr, com.vebops.domain.Service svc) {
        if (svc != null) {
            String name = trimToNull(svc.getBuyerName());
            String gst = trimToNull(svc.getBuyerGst());
            String address = trimToNull(svc.getBuyerAddress());
            String pin = trimToNull(svc.getBuyerPin());
            String state = trimToNull(svc.getBuyerState());
            String contact = trimToNull(svc.getBuyerContact());
            String email = trimToNull(svc.getBuyerEmail());
            if (hasText(name) || hasText(gst) || hasText(address) || hasText(pin) || hasText(state) || hasText(contact) || hasText(email)) {
                return new BuyerSummary(name, gst, address, pin, state, contact, email);
            }
        }
        if (sr != null && sr.getCustomer() != null) {
            var customer = sr.getCustomer();
            customer.getName();
            customer.getEmail();
            customer.getMobile();
            customer.getAddress();
            String name = trimToNull(customer.getName());
            String address = trimToNull(customer.getAddress());
            String contact = trimToNull(customer.getMobile());
            String email = trimToNull(customer.getEmail());
            if (hasText(name) || hasText(address) || hasText(contact) || hasText(email)) {
                return new BuyerSummary(name, null, address, null, null, contact, email);
            }
        }
        return null;
    }

    private ConsigneeSummary deriveConsigneeSummary(com.vebops.domain.Service svc) {
        if (svc == null) {
            return null;
        }
        String name = trimToNull(svc.getConsigneeName());
        String gst = trimToNull(svc.getConsigneeGst());
        String address = trimToNull(svc.getConsigneeAddress());
        String pin = trimToNull(svc.getConsigneePin());
        String state = trimToNull(svc.getConsigneeState());
        if (hasText(name) || hasText(gst) || hasText(address) || hasText(pin) || hasText(state)) {
            return new ConsigneeSummary(name, gst, address, pin, state);
        }
        return null;
    }

    private KitSummary deriveKitSummary(Long tenantId, ServiceRequest sr) {
        if (sr == null || sr.getProposal() == null || sr.getProposal().getKit() == null) {
            return null;
        }
        var proposal = sr.getProposal();
        var kit = proposal.getKit();
        if (kit == null) {
            return null;
        }
        kit.getId();
        kit.getName();
        kit.getCode();
        kit.getDescription();
        kit.getHsnSac();
        kit.getBrand();
        kit.getVoltageKV();
        kit.getCores();
        kit.getSizeSqmm();
        kit.getCategory();
        kit.getMaterial();
        kit.getPrice();

        List<KitComponent> components = new ArrayList<>();
        if (kit.getId() != null) {
            List<KitItem> kitItems = kitItemRepo.findByTenantIdAndKit_Id(tenantId, kit.getId());
            if (kitItems != null) {
                for (KitItem ki : kitItems) {
                    if (ki.getItem() != null) {
                        ki.getItem().getId();
                        ki.getItem().getCode();
                        ki.getItem().getName();
                        ki.getItem().getSpec();
                        ki.getItem().getHsnSac();
                        ki.getItem().getUom();
                    }
                    components.add(new KitComponent(
                        ki.getItem() != null ? ki.getItem().getId() : null,
                        ki.getItem() != null ? trimToNull(ki.getItem().getCode()) : null,
                        ki.getItem() != null ? trimToNull(ki.getItem().getName()) : null,
                        ki.getItem() != null ? trimToNull(ki.getItem().getSpec()) : null,
                        ki.getItem() != null ? trimToNull(ki.getItem().getHsnSac()) : null,
                        ki.getItem() != null ? trimToNull(ki.getItem().getUom()) : null,
                        ki.getQty()
                    ));
                }
            }
        }
        String kitName = trimToNull(kit.getName());
        if (!hasText(kitName) && components.isEmpty()) {
            return null;
        }
        return new KitSummary(
            kit.getId(),
            trimToNull(kit.getCode()),
            kitName,
            trimToNull(kit.getDescription()),
            trimToNull(kit.getHsnSac()),
            trimToNull(kit.getBrand()),
            trimToNull(kit.getVoltageKV()),
            trimToNull(kit.getCores()),
            kit.getSizeSqmm(),
            trimToNull(kit.getCategory()),
            trimToNull(kit.getMaterial()),
            kit.getPrice(),
            components
        );
    }

    private com.vebops.domain.Service resolveLinkedService(Long tenantId, Long srId, Long woId) {
        if (tenantId == null) {
            return null;
        }
        List<com.vebops.domain.Service> candidates = serviceRepo.findTop50ByTenantIdOrderByCreatedAtDesc(tenantId);
        com.vebops.domain.Service srMatch = null;
        com.vebops.domain.Service woMatch = null;
        for (com.vebops.domain.Service svc : candidates) {
            if (svc == null) {
                continue;
            }
            String meta = svc.getMetaJson();
            String compact = meta != null ? meta.replaceAll("\\s+", "") : null;
            boolean matchesSr = srId != null && metaContains(compact, srId, "serviceRequestId", "srId");
            boolean matchesWo = woId != null && metaContains(compact, woId, "workOrderId", "woId");
            if (matchesSr && matchesWo) {
                return svc;
            }
            if (matchesSr && srMatch == null) {
                srMatch = svc;
            }
            if (matchesWo && woMatch == null) {
                woMatch = svc;
            }
        }
        return srMatch != null ? srMatch : woMatch;
    }

    private boolean metaContains(String compactMeta, Long value, String... keys) {
        if (compactMeta == null || value == null || keys == null || keys.length == 0) {
            return false;
        }
        String str = value.toString();
        for (String key : keys) {
            if (key == null) {
                continue;
            }
            String prefix = "\"" + key + "\":";
            if (compactMeta.contains(prefix + str) || compactMeta.contains(prefix + "\"" + str + "\"")) {
                return true;
            }
        }
        return false;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private ProgressAttachmentView toAttachmentView(Long woId, Long progressId, WorkOrderProgressAttachment attachment) {
        Long id = attachment.getId();
        String filename = attachment.getFilename();
        String contentType = attachment.getContentType();
        Long size = attachment.getSize();
        Instant uploadedAt = attachment.getUploadedAt();
        String downloadPath = id == null ? null
                : String.format("/fe/wo/%d/progress/%d/attachments/%d", woId, progressId, id);
        return new ProgressAttachmentView(id, filename, contentType, size, uploadedAt, downloadPath);
    }

    public record FeWorkOrderDetail(WorkOrder workOrder,
                                    String instruction,
                                    List<FeWorkOrderItem> items,
                                    ServiceSummary serviceInfo,
                                    List<ProgressEntry> progress) { }

    public record FeWorkOrderItem(Long id,
                                  String name,
                                  String code,
                                  String spec,
                                  String hsn,
                                  String uom,
                                  java.math.BigDecimal qtyPlanned,
                                  java.math.BigDecimal qtyIssued) { }

    public record ServiceSummary(Long serviceRequestId,
                                 String srn,
                                 String serviceType,
                                 String description,
                                 String siteAddress,
                                 String customerName,
                                 String customerEmail,
                                 String customerMobile,
                                 String customerAddress,
                                 BuyerSummary buyer,
                                 ConsigneeSummary consignee,
                                 KitSummary kit,
                                 String customerPoNumber,
                                 Long serviceId) { }

    public record BuyerSummary(String name,
                               String gst,
                               String address,
                               String pin,
                               String state,
                               String contact,
                               String email) { }

    public record ConsigneeSummary(String name,
                                   String gst,
                                   String address,
                                   String pin,
                                   String state) { }

    public record KitSummary(Long id,
                             String code,
                             String name,
                             String description,
                             String hsn,
                             String brand,
                             String voltage,
                             String cores,
                             Integer sizeSqmm,
                             String category,
                             String material,
                             java.math.BigDecimal price,
                             List<KitComponent> components) { }

    public record KitComponent(Long itemId,
                               String code,
                               String name,
                               String spec,
                               String hsn,
                               String uom,
                               java.math.BigDecimal qty) { }

    public record ProgressEntry(Long id,
                                String status,
                                String remarks,
                                String photoUrl,
                                Instant createdAt,
                                ProgressUser by,
                                List<ProgressAttachmentView> attachments) { }

    public record ProgressUser(Long id, String name) { }

    public record ProgressAttachmentView(Long id,
                                         String filename,
                                         String contentType,
                                         Long size,
                                         Instant uploadedAt,
                                         String downloadPath) { }
}
