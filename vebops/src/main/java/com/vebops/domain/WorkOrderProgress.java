package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;
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
}
