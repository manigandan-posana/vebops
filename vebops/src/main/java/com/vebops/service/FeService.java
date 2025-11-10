package com.vebops.service;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.vebops.context.TenantContext;
import com.vebops.domain.FieldEngineer;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.dto.ProgressRequest;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.FieldEngineerRepository;
import com.vebops.repository.WorkOrderAssignmentRepository;
import com.vebops.repository.WorkOrderItemRepository;
import com.vebops.repository.WorkOrderProgressRepository;
import com.vebops.repository.WorkOrderQueryRepository;
import com.vebops.repository.WorkOrderRepository;
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

    public FeService(WorkOrderService workOrders,
                     WorkOrderQueryRepository woQuery,
                     WorkOrderRepository woRepo,
                     WorkOrderProgressRepository woProgressRepo,
                     WorkOrderItemRepository woItemRepo,
                     WorkOrderAssignmentRepository woAssignRepo,
                     FieldEngineerRepository feRepo) {
        this.workOrders = workOrders;
        this.woQuery = woQuery;
        this.woRepo = woRepo;
        this.woProgressRepo = woProgressRepo;
        this.woItemRepo = woItemRepo;
        this.woAssignRepo = woAssignRepo;
        this.feRepo = feRepo;
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
        workOrders.addProgress(tid, woId, req.status, feId, req.remarks, req.photoUrl);
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
        byte[] pdf = PdfUtil.buildCompletionReportPdf(wo, progress);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=completion-report-" + wo.getWan() + ".pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
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

        if (wo.getServiceRequest() != null) {
            var sr = wo.getServiceRequest();
            sr.getServiceType();
            if (sr.getCustomer() != null) {
                sr.getCustomer().getName();
                sr.getCustomer().getEmail();
                sr.getCustomer().getMobile();
            }
            if (sr.getProposal() != null && sr.getProposal().getKit() != null) {
                sr.getProposal().getKit().getName();
            }
        }
        if (wo.getCustomerPO() != null) {
            wo.getCustomerPO().getPoNumber();
        }

        List<com.vebops.domain.WorkOrderItem> items = woItemRepo.findByTenantIdAndWorkOrder_Id(tid, woId);
        items.forEach(it -> {
            if (it.getItem() != null) {
                it.getItem().getName();
                it.getItem().getCode();
            }
        });

        var assignment = woAssignRepo.findByTenantIdAndWorkOrder_IdOrderByAssignedAtDesc(tid, woId)
                .stream().findFirst().orElse(null);
        String instruction = assignment != null ? assignment.getNote() : null;

        return ResponseEntity.ok(new FeWorkOrderDetail(wo, instruction, items));
    }

    public record FeWorkOrderDetail(WorkOrder workOrder,
                                    String instruction,
                                    List<com.vebops.domain.WorkOrderItem> items) { }

}