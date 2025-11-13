package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

/**
 * Individual line items for a {@link PurchaseOrder}. Stored separately so
 * the PDF generator and API consumers can present clean tabular data.
 */
@Entity
@Table(name = "purchase_order_lines",
    indexes = {
        @Index(name = "idx_po_line_tenant", columnList = "tenant_id"),
        @Index(name = "idx_po_line_po", columnList = "purchase_order_id")
    }
)
public class PurchaseOrderLine extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "purchase_order_id", nullable = false)
    private PurchaseOrder purchaseOrder;

    @Column(nullable = false)
    private Integer lineNumber;

    @Column(length = 512)
    private String description;

    @Column(precision = 18, scale = 2)
    private BigDecimal quantity;

    @Column(length = 32)
    private String unit;

    @Column(precision = 18, scale = 2)
    private BigDecimal rate;

    @Column(precision = 18, scale = 2)
    private BigDecimal amount;

    public PurchaseOrder getPurchaseOrder() { return purchaseOrder; }
    public void setPurchaseOrder(PurchaseOrder purchaseOrder) { this.purchaseOrder = purchaseOrder; }

    public Integer getLineNumber() { return lineNumber; }
    public void setLineNumber(Integer lineNumber) { this.lineNumber = lineNumber; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getQuantity() { return quantity; }
    public void setQuantity(BigDecimal quantity) { this.quantity = quantity; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
