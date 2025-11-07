package com.vebops.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import com.vebops.domain.enums.*;

@Entity
@Table(name = "work_orders",
    uniqueConstraints ={ @UniqueConstraint(name = "uk_wan", columnNames = {"tenant_id","wan"}),
    @UniqueConstraint(name = "uk_tenant_sr", columnNames = {"tenant_id","sr_id"})
},
    
    indexes = {
        @Index(name = "idx_wo_tenant", columnList = "tenant_id"),
        @Index(name = "idx_wo_sr", columnList = "sr_id")
    }
)
@EntityListeners(WorkOrder.EntityListener.class)
public class WorkOrder extends BaseTenantEntity {

    @Column(nullable = false, length = 32)
    private String wan; // generated in service layer

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sr_id", nullable = false)
    private ServiceRequest serviceRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_po_id")
    private CustomerPO customerPO; // optional

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private WOStatus status = WOStatus.NEW;

    private LocalDate startDate;
    private LocalDate dueDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_fe_id")
    private FieldEngineer assignedFE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_team_id")
    private Team assignedTeam;

    // --- Guard: require SR and approved proposal ---
    public static class EntityListener {
        @PrePersist
        public void beforeInsert(WorkOrder wo) {
            if (wo.serviceRequest == null) {
                throw new IllegalStateException("Cannot create WO without an SR.");
            }
            var sr = wo.serviceRequest;
            var st = sr.getServiceType();
            boolean requiresProposal = st == ServiceTypeCode.SUPPLY || st == ServiceTypeCode.SUPPLY_INSTALL;
            if (requiresProposal) {
                // Must have an approved proposal
                if (sr.getProposal() == null || sr.getProposal().getStatus() != ProposalStatus.APPROVED) {
                    throw new IllegalStateException("Cannot create WO before proposal is APPROVED.");
                }
            } else {
                // If a proposal exists for other service types it must still be approved
                if (sr.getProposal() != null && sr.getProposal().getStatus() != ProposalStatus.APPROVED) {
                    throw new IllegalStateException("Cannot create WO before proposal is APPROVED.");
                }
            }
        }
    }

    public String getWan() { return wan; }
    public void setWan(String wan) { this.wan = wan; }
    public ServiceRequest getServiceRequest() { return serviceRequest; }
    public void setServiceRequest(ServiceRequest serviceRequest) { this.serviceRequest = serviceRequest; }
    public CustomerPO getCustomerPO() { return customerPO; }
    public void setCustomerPO(CustomerPO customerPO) { this.customerPO = customerPO; }
    public WOStatus getStatus() { return status; }
    public void setStatus(WOStatus status) { this.status = status; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public FieldEngineer getAssignedFE() { return assignedFE; }
    public void setAssignedFE(FieldEngineer assignedFE) { this.assignedFE = assignedFE; }
    public Team getAssignedTeam() { return assignedTeam; }
    public void setAssignedTeam(Team assignedTeam) { this.assignedTeam = assignedTeam; }
}
