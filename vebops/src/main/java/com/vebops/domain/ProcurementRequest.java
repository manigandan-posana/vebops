package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import com.vebops.domain.enums.ProcurementStatus;

@Entity
@Table(name = "procurement_requests",
    indexes = @Index(name = "idx_proc_tenant", columnList = "tenant_id"))
public class ProcurementRequest extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal qty;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ProcurementStatus status = ProcurementStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "raised_from_wo_id")
    private WorkOrder raisedFromWorkOrder;

    @Column(length = 512)
    private String note;

    @Column(name = "required_by")
    private java.time.LocalDate requiredBy;

    public Item getItem() { return item; }
    public void setItem(Item item) { this.item = item; }
    public BigDecimal getQty() { return qty; }
    public void setQty(BigDecimal qty) { this.qty = qty; }
    public ProcurementStatus getStatus() { return status; }
    public void setStatus(ProcurementStatus status) { this.status = status; }
    public WorkOrder getRaisedFromWorkOrder() { return raisedFromWorkOrder; }
    public void setRaisedFromWorkOrder(WorkOrder raisedFromWorkOrder) { this.raisedFromWorkOrder = raisedFromWorkOrder; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public java.time.LocalDate getRequiredBy() { return requiredBy; }
    public void setRequiredBy(java.time.LocalDate requiredBy) { this.requiredBy = requiredBy; }
}
