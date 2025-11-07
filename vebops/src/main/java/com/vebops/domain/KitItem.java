package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "kit_items",
    uniqueConstraints = @UniqueConstraint(name = "uk_kit_item", columnNames = {"tenant_id","kit_id","item_id"}),
    indexes = @Index(name = "idx_kit_item_tenant", columnList = "tenant_id"))
public class KitItem extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "kit_id", nullable = false)
    private Kit kit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "item_id", nullable = false)
    private Item item;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal qty;

    public Kit getKit() { return kit; }
    public void setKit(Kit kit) { this.kit = kit; }
    public Item getItem() { return item; }
    public void setItem(Item item) { this.item = item; }
    public BigDecimal getQty() { return qty; }
    public void setQty(BigDecimal qty) { this.qty = qty; }
}
