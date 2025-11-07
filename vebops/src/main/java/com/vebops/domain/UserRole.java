package com.vebops.domain;

import jakarta.persistence.*;
import com.vebops.domain.enums.RoleCode;

@Entity
@Table(name = "user_roles",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_role_tenant", columnNames = {"user_id","tenant_id","role_code"}),
    indexes = {
        @Index(name = "idx_user_role_user", columnList = "user_id"),
        @Index(name = "idx_user_role_tenant", columnList = "tenant_id")
    }
)
public class UserRole extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_code", nullable = false, length = 32)
    private RoleCode roleCode;

    @Column(nullable = false)
    private boolean primaryRole = false;

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public RoleCode getRoleCode() { return roleCode; }
    public void setRoleCode(RoleCode roleCode) { this.roleCode = roleCode; }
    public boolean isPrimaryRole() { return primaryRole; }
    public void setPrimaryRole(boolean primaryRole) { this.primaryRole = primaryRole; }
}
