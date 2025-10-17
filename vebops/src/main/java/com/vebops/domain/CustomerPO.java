package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "customer_po",
    indexes = {
        @Index(name = "idx_po_tenant", columnList = "tenant_id"),
        @Index(name = "idx_po_proposal", columnList = "proposal_id")
    }
)
public class CustomerPO extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proposal_id", nullable = false)
    private Proposal proposal;

    @Column(nullable = false, length = 64)
    private String poNumber;

    @Column(length = 512)
    private String fileUrl;

    @Column(nullable = false)
    private Instant uploadedAt = Instant.now();

    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }
}
