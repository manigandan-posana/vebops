package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.math.BigDecimal;

@Entity
@Table(name = "item_stocks",
    uniqueConstraints = @UniqueConstraint(name = "uk_item_store", columnNames = {"item_id","store_id"}),
    indexes = @Index(name = "idx_item_stock_tenant", columnList = "tenant_id")
)
public class ItemStock extends BaseTenantEntity {

    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal qtyOnHand = BigDecimal.ZERO;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal qtyReserved = BigDecimal.ZERO;

    @Column(nullable = false)
    private Instant asOf = Instant.now();


    public Item getItem() { return item; }
    public void setItem(Item item) { this.item = item; }
    public Store getStore() { return store; }
    public void setStore(Store store) { this.store = store; }
    public BigDecimal getQtyOnHand() { return qtyOnHand; }
    public void setQtyOnHand(BigDecimal qtyOnHand) { this.qtyOnHand = qtyOnHand; }
    public BigDecimal getQtyReserved() { return qtyReserved; }
    public void setQtyReserved(BigDecimal qtyReserved) { this.qtyReserved = qtyReserved; }
    public Instant getAsOf() { return asOf; }
    public void setAsOf(Instant asOf) { this.asOf = asOf; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
