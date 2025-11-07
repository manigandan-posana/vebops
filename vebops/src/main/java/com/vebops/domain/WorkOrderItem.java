package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "work_order_items",
    indexes = {
        @Index(name = "idx_wo_item_tenant", columnList = "tenant_id"),
        @Index(name = "idx_wo_item_wo", columnList = "wo_id")
    }
)
public class WorkOrderItem extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wo_id", nullable = false)
    private WorkOrder workOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal qtyPlanned = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal qtyIssued = BigDecimal.ZERO;

    public WorkOrder getWorkOrder() { return workOrder; }
    public void setWorkOrder(WorkOrder workOrder) { this.workOrder = workOrder; }
    public Item getItem() { return item; }
    public void setItem(Item item) { this.item = item; }
    public BigDecimal getQtyPlanned() { return qtyPlanned; }
    public void setQtyPlanned(BigDecimal qtyPlanned) { this.qtyPlanned = qtyPlanned; }
    public BigDecimal getQtyIssued() { return qtyIssued; }
    public void setQtyIssued(BigDecimal qtyIssued) { this.qtyIssued = qtyIssued; }
}
