package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "work_order_assignments",
    indexes = {
        @Index(name = "idx_wo_assign_tenant", columnList = "tenant_id"),
        @Index(name = "idx_wo_assign_wo", columnList = "wo_id")
    }
)
public class WorkOrderAssignment extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wo_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fe_id")
    private FieldEngineer fieldEngineer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    private Team team;

    @Column(nullable = false)
    private Instant assignedAt = Instant.now();

    @Column(length = 255)
    private String note;

    public WorkOrder getWorkOrder() { return workOrder; }
    public void setWorkOrder(WorkOrder workOrder) { this.workOrder = workOrder; }
    public FieldEngineer getFieldEngineer() { return fieldEngineer; }
    public void setFieldEngineer(FieldEngineer fieldEngineer) { this.fieldEngineer = fieldEngineer; }
    public Team getTeam() { return team; }
    public void setTeam(Team team) { this.team = team; }
    public Instant getAssignedAt() { return assignedAt; }
    public void setAssignedAt(Instant assignedAt) { this.assignedAt = assignedAt; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
