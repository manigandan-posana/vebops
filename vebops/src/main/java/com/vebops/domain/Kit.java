package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import com.vebops.domain.enums.ServiceTypeCode;

@Entity
@Table(name = "kits", indexes = @Index(name = "idx_kit_tenant", columnList = "tenant_id"))
public class Kit extends BaseTenantEntity {

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 512)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private ServiceTypeCode serviceType;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal price;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public ServiceTypeCode getServiceType() { return serviceType; }
    public void setServiceType(ServiceTypeCode serviceType) { this.serviceType = serviceType; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
}
