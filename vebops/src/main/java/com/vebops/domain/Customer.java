package com.vebops.domain;

import jakarta.persistence.*;

@Entity
@Table(
  name = "customers",
  uniqueConstraints = {
      @UniqueConstraint(name = "uk_customer_tenant_email",  columnNames = {"tenant_id","email"}),
      @UniqueConstraint(name = "uk_customer_tenant_mobile", columnNames = {"tenant_id","mobile"})
  },
  indexes = {
      @Index(name = "idx_customer_tenant", columnList = "tenant_id"),
      @Index(name = "idx_customer_email", columnList = "email")
  }
)
public class Customer extends BaseTenantEntity {

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 190)
    private String email;

    @Column(length = 32)
    private String mobile;

    @Column(length = 256)
    private String address;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User portalUser; // optional portal login

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public User getPortalUser() { return portalUser; }
    public void setPortalUser(User portalUser) { this.portalUser = portalUser; }
}
