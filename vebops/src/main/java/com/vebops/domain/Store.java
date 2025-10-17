package com.vebops.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "stores", indexes = @Index(name = "idx_store_tenant", columnList = "tenant_id"))
public class Store extends BaseTenantEntity {

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 160)
    private String location;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
}
