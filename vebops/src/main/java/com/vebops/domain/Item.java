package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import com.vebops.domain.enums.RateType;

@Entity
@Table(name = "items",
    uniqueConstraints = @UniqueConstraint(name = "uk_item_code_tenant", columnNames = {"tenant_id","code"}),
    indexes = @Index(name = "idx_item_tenant", columnList = "tenant_id")
)
public class Item extends BaseTenantEntity {

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, length = 32)
    private String uom;

    /** “Standard” price or rolling average, depending on rateType */
    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal rate;

    /** NEW: free-form tech spec */
    @Column(length = 512)
    private String spec;

    /** NEW: tax % (0–100) */
    @Column(precision = 5, scale = 2)
    private BigDecimal taxPercent;

    /** NEW: HSN/SAC code */
    @Column(length = 32)
    private String hsnSac;

    /** NEW: STANDARD (default) or AVG (rolling average) */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RateType rateType = RateType.STANDARD;

    // getters/setters
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUom() { return uom; }
    public void setUom(String uom) { this.uom = uom; }
    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }
    public String getSpec() { return spec; }
    public void setSpec(String spec) { this.spec = spec; }
    public BigDecimal getTaxPercent() { return taxPercent; }
    public void setTaxPercent(BigDecimal taxPercent) { this.taxPercent = taxPercent; }
    public String getHsnSac() { return hsnSac; }
    public void setHsnSac(String hsnSac) { this.hsnSac = hsnSac; }
    public RateType getRateType() { return rateType; }
    public void setRateType(RateType rateType) { this.rateType = rateType; }
}
