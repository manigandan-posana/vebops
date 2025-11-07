package com.vebops.domain;

import jakarta.persistence.*;
import com.vebops.domain.enums.FEStatus;

@Entity
@Table(
  name = "field_engineers",
  uniqueConstraints = {
      @UniqueConstraint(name = "uk_fe_tenant_user", columnNames = {"tenant_id","user_id"})
  },
  indexes = @Index(name = "idx_fe_tenant", columnList = "tenant_id")
)
public class FieldEngineer extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private FEStatus status = FEStatus.AVAILABLE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store homeStore;

    public Store getHomeStore() { return homeStore; }
    public void setHomeStore(Store homeStore) { this.homeStore = homeStore; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public FEStatus getStatus() { return status; }
    public void setStatus(FEStatus status) { this.status = status; }
}
