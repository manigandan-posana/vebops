package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import com.vebops.domain.enums.ServiceTypeCode;

@Entity
@Table(name = "kits", indexes = @Index(name = "idx_kit_tenant", columnList = "tenant_id"))
public class Kit extends BaseTenantEntity {

    /**
     * Unique code identifying the kit. Historically VebOps did not expose a
     * separate code field and instead encoded everything in the kit name. To
     * support richer catalogues (e.g. HT Power products) this field allows a
     * concise machine‑readable identifier. It is not mandatory on create; if
     * absent a value will be generated using the service type and a timestamp.
     */
    @Column(name = "code", length = 64, unique = true)
    private String code;

    /**
     * Harmonised System of Nomenclature / Service Accounting Code. All kits
     * default to 854690 if not provided.
     */
    @Column(name = "hsn_sac", length = 16)
    private String hsnSac;

    /** Optional brand or manufacturer for the kit. */
    @Column(name = "brand", length = 64)
    private String brand;

    /** Nominal voltage rating (e.g. 1.1kV, 11kV, 22kV). */
    @Column(name = "voltage_kv", length = 16)
    private String voltageKV;

    /** Core configuration (e.g. 1C, 3C, 3p5C). */
    @Column(name = "cores", length = 16)
    private String cores;

    /** Conductor cross‑sectional area in square millimetres (e.g. 35, 95). */
    @Column(name = "size_sqmm")
    private Integer sizeSqmm;

    /** High level category (e.g. STJ, INDOOR, OUTDOOR). */
    @Column(name = "category", length = 32)
    private String category;

    /** Material composition (e.g. AL, CU) if applicable. */
    @Column(name = "material", length = 32)
    private String material;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 512)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 24)
    private ServiceTypeCode serviceType;

    @Column(precision = 18, scale = 2)
    private BigDecimal price;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getHsnSac() { return hsnSac; }
    public void setHsnSac(String hsnSac) { this.hsnSac = hsnSac; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getVoltageKV() { return voltageKV; }
    public void setVoltageKV(String voltageKV) { this.voltageKV = voltageKV; }
    public String getCores() { return cores; }
    public void setCores(String cores) { this.cores = cores; }
    public Integer getSizeSqmm() { return sizeSqmm; }
    public void setSizeSqmm(Integer sizeSqmm) { this.sizeSqmm = sizeSqmm; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getMaterial() { return material; }
    public void setMaterial(String material) { this.material = material; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ServiceTypeCode getServiceType() { return serviceType; }
    public void setServiceType(ServiceTypeCode serviceType) { this.serviceType = serviceType; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}
