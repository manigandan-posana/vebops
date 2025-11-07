package com.vebops.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

/**
 * CompanyDetails captures the tenant‑specific organisation profile used on
 * invoices, purchase orders and other documents. Unlike the Tenant entity
 * this record is fully editable by back office users and is scoped to a
 * single tenant. Storing these fields separately avoids polluting the
 * Tenant table with optional columns and allows logos to be stored as
 * Data URLs without a dedicated file store.
 */
@Entity
@Table(name = "company_details", indexes = @Index(name = "idx_company_tenant", columnList = "tenant_id"))
public class CompanyDetails extends BaseTenantEntity {

    @Column(length = 160)
    private String name;

    @Column(length = 32)
    private String phone;

    @Column(length = 160)
    private String email;

    @Column(length = 160)
    private String website;

    @Column(length = 64)
    private String state;

    @Column(length = 16)
    private String stateCode;

    @Column(length = 32)
    private String gstin;

    @Column(length = 32)
    private String pan;

    @Column(length = 160)
    private String bankName;

    @Column(length = 64)
    private String accNo;

    @Column(length = 160)
    private String branch;

    @Column(length = 32)
    private String ifsc;

    @Column(length = 255)
    private String addressLine1;

    @Column(length = 255)
    private String addressLine2;

    // Stores the company logo as a Data URL (e.g. data:image/png;base64,...)
    //
    // A typical PNG or JPEG encoded as a Data URL can easily exceed the 64KB
    // limit of a MySQL TEXT column.  When very large images are uploaded the
    // resulting base64 string would be truncated, causing a
    // DataIntegrityViolationException.  To accommodate reasonably sized
    // logos (up to ~4MB) we persist the value in a LONGTEXT column.  The
    // @Lob annotation instructs Hibernate to treat the field as a large
    // object, and the explicit LONGTEXT definition ensures MySQL allocates
    // sufficient space.  See: https://dev.mysql.com/doc/refman/en/blob.html
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String logoDataUrl;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getStateCode() { return stateCode; }
    public void setStateCode(String stateCode) { this.stateCode = stateCode; }
    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }
    public String getPan() { return pan; }
    public void setPan(String pan) { this.pan = pan; }
    public String getBankName() { return bankName; }
    public void setBankName(String bankName) { this.bankName = bankName; }
    public String getAccNo() { return accNo; }
    public void setAccNo(String accNo) { this.accNo = accNo; }
    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }
    public String getIfsc() { return ifsc; }
    public void setIfsc(String ifsc) { this.ifsc = ifsc; }
    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }
    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }
    public String getLogoDataUrl() { return logoDataUrl; }
    public void setLogoDataUrl(String logoDataUrl) { this.logoDataUrl = logoDataUrl; }
}