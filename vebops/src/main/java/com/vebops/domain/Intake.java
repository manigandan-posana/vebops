package com.vebops.domain;

import jakarta.persistence.*;
import com.vebops.domain.enums.ServiceTypeCode;

@Entity
@Table(name = "intakes", indexes = @Index(name = "idx_intake_tenant", columnList = "tenant_id"))
public class Intake extends BaseTenantEntity {

    @Column(nullable = false, length = 16)
    private String channel; // CALL|EMAIL

    @Column(nullable = false, length = 160)
    private String customerName;

    @Column(length = 190)  private String email;
    @Column(length = 32)   private String mobile;
    @Column(length = 256)  private String address;

    @Enumerated(EnumType.STRING)
    @Column(length = 24)
    private ServiceTypeCode serviceType; // NEW

    @Column(length = 96)
    private String serviceHint; // optional free text

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposal_id")
    private Proposal proposal;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sr_id")
    private ServiceRequest serviceRequest;

    // getters/setters
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getMobile() { return mobile; }
    public void setMobile(String mobile) { this.mobile = mobile; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public ServiceTypeCode getServiceType() { return serviceType; }
    public void setServiceType(ServiceTypeCode serviceType) { this.serviceType = serviceType; }
    public String getServiceHint() { return serviceHint; }
    public void setServiceHint(String serviceHint) { this.serviceHint = serviceHint; }
    public Proposal getProposal() { return proposal; }
    public void setProposal(Proposal proposal) { this.proposal = proposal; }
    public ServiceRequest getServiceRequest() { return serviceRequest; }
    public void setServiceRequest(ServiceRequest serviceRequest) { this.serviceRequest = serviceRequest; }
}
