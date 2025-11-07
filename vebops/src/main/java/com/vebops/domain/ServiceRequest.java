package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import com.vebops.domain.enums.*;

@Entity
@Table(name = "service_requests",
    uniqueConstraints = @UniqueConstraint(name = "uk_srn", columnNames = {"tenant_id","srn"}),
    indexes = {
        @Index(name = "idx_sr_tenant", columnList = "tenant_id"),
        @Index(name = "idx_sr_customer", columnList = "customer_id")
    }
)
@EntityListeners(ServiceRequest.EntityListener.class)
public class ServiceRequest extends BaseTenantEntity {

    @Column(nullable = false, length = 32)
    private String srn; // generated in service layer

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposal_id")
    private Proposal proposal;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private ServiceTypeCode serviceType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private SRStatus status = SRStatus.NEW;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 256)
    private String siteAddress;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    // --- Guard: enforce proposal approval before SR is persisted ---
    public static class EntityListener {
        @PrePersist
        public void beforeInsert(ServiceRequest sr) {
            // If the service requires a proposal (SUPPLY or SUPPLY_INSTALL), then
            // ensure a proposal exists and is approved. For other service
            // types (INSTALL_ONLY, ERECTION) the proposal may be null.
            var st = sr.getServiceType();
            boolean requiresProposal = st == ServiceTypeCode.SUPPLY || st == ServiceTypeCode.SUPPLY_INSTALL;
            if (requiresProposal) {
                if (sr.proposal == null || sr.proposal.getStatus() != ProposalStatus.APPROVED) {
                    throw new IllegalStateException("Cannot create SR before proposal is APPROVED.");
                }
            } else {
                // If a proposal is supplied for non-supply types it must still be approved
                if (sr.proposal != null && sr.proposal.getStatus() != ProposalStatus.APPROVED) {
                    throw new IllegalStateException("Cannot create SR before proposal is APPROVED.");
                }
            }
        }
    }

    public String getSrn() { return srn; }
    public void setSrn(String srn) { this.srn = srn; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public Customer getCustomer() { return customer; }
    public void setCustomer(Customer customer) { this.customer = customer; }
    public ServiceTypeCode getServiceType() { return serviceType; }
    public void setServiceType(ServiceTypeCode serviceType) { this.serviceType = serviceType; }
    public SRStatus getStatus() { return status; }
    public void setStatus(SRStatus status) { this.status = status; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSiteAddress() { return siteAddress; }
    public void setSiteAddress(String siteAddress) { this.siteAddress = siteAddress; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
