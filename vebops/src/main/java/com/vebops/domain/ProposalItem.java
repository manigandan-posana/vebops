package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "proposal_items",
    indexes = @Index(name = "idx_proposal_item_tenant", columnList = "tenant_id"))
public class ProposalItem extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proposal_id", nullable = false)
    private Proposal proposal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id")
    private Item item; // nullable for service lines

    @Column(nullable = false, length = 255)
    private String description;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal qty;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal rate;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    // add fields + getters/setters
    @Column(length = 32)
    private String hsn;            // HSN/SAC

    @Column(precision = 5, scale = 2)
    private BigDecimal taxRate;    // IGST % (e.g. 18.00)

    @Column(precision = 18, scale = 2)
    private BigDecimal taxAmount;  // computed line tax = qty*rate*tax%

    public String getHsn() { return hsn; }
    public void setHsn(String hsn) { this.hsn = hsn; }
    public BigDecimal getTaxRate() { return taxRate; }
    public void setTaxRate(BigDecimal taxRate) { this.taxRate = taxRate; }
    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public Item getItem() { return item; }
    public void setItem(Item item) { this.item = item; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getQty() { return qty; }
    public void setQty(BigDecimal qty) { this.qty = qty; }
    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
