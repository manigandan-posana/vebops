package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import com.vebops.domain.enums.TxType;
import com.vebops.domain.enums.RefType;

@Entity
@Table(name = "stock_ledger",
    indexes = {
        @Index(name = "idx_ledger_tenant", columnList = "tenant_id"),
        @Index(name = "idx_ledger_item", columnList = "item_id"),
        @Index(name = "idx_ledger_store", columnList = "store_id")
    }
)
public class StockLedger extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private TxType txType; // IN|OUT|ADJUST

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private RefType refType; // WO_ISSUE|PO_RECEIPT|ADJUSTMENT

    @Column(nullable = true)
    private Long refId;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal qty;

    @Column(precision = 18, scale = 2)
    private BigDecimal rate; // nullable (for OUT/ADJUST)

    @Column(precision = 18, scale = 2)
    private BigDecimal balanceAfter; // optional running balance

    @Column(nullable = false)
    private Instant occurredAt = Instant.now();

    public Item getItem() { return item; }
    public void setItem(Item item) { this.item = item; }
    public Store getStore() { return store; }
    public void setStore(Store store) { this.store = store; }
    public TxType getTxType() { return txType; }
    public void setTxType(TxType txType) { this.txType = txType; }
    public RefType getRefType() { return refType; }
    public void setRefType(RefType refType) { this.refType = refType; }
    public Long getRefId() { return refId; }
    public void setRefId(Long refId) { this.refId = refId; }
    public BigDecimal getQty() { return qty; }
    public void setQty(BigDecimal qty) { this.qty = qty; }
    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }
    public BigDecimal getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }
    public Instant getOccurredAt() { return occurredAt; }
    public void setOccurredAt(Instant occurredAt) { this.occurredAt = occurredAt; }
}
