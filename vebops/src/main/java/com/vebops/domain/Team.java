package com.vebops.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "teams", indexes = @Index(name = "idx_team_tenant", columnList = "tenant_id"))
public class Team extends BaseTenantEntity {

    @Column(nullable = false, length = 160)
    private String name;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
