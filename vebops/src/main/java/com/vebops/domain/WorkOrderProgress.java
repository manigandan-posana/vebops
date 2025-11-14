package com.vebops.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import com.vebops.domain.enums.WOProgressStatus;

@Entity
@Table(name = "work_order_progress",
    indexes = {
        @Index(name = "idx_wo_prog_tenant", columnList = "tenant_id"),
        @Index(name = "idx_wo_prog_wo", columnList = "wo_id")
    }
)
public class WorkOrderProgress extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wo_id", nullable = false)
    private WorkOrder workOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private WOProgressStatus status;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "by_fe_id", nullable = false)
    private FieldEngineer byFE;

    @Column(length = 1024)
    private String remarks;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(length = 512)
    private String photoUrl;

    @OneToMany(mappedBy = "progress", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<WorkOrderProgressAttachment> attachments = new ArrayList<>();

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public WorkOrder getWorkOrder() { return workOrder; }
    public void setWorkOrder(WorkOrder workOrder) { this.workOrder = workOrder; }
    public WOProgressStatus getStatus() { return status; }
    public void setStatus(WOProgressStatus status) { this.status = status; }
    public FieldEngineer getByFE() { return byFE; }
    public void setByFE(FieldEngineer byFE) { this.byFE = byFE; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public List<WorkOrderProgressAttachment> getAttachments() { return attachments; }
    public void setAttachments(List<WorkOrderProgressAttachment> attachments) { this.attachments = attachments; }
    public void addAttachment(WorkOrderProgressAttachment attachment) {
        if (attachment == null) return;
        attachments.add(attachment);
        attachment.setProgress(this);
    }
}
