package com.vebops.domain;

import jakarta.persistence.*;
import com.vebops.domain.enums.RoleCode;

@Entity
@Table(name = "roles")
public class Role extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 32)
    private RoleCode code;

    @Column(nullable = false, length = 128)
    private String name;

    public RoleCode getCode() { return code; }
    public void setCode(RoleCode code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
