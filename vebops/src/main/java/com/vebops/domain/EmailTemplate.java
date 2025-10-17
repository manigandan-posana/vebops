package com.vebops.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "email_templates",
    uniqueConstraints = @UniqueConstraint(name = "uk_email_tpl_code", columnNames = {"tenant_id","code"}),
    indexes = @Index(name = "idx_email_tpl_tenant", columnList = "tenant_id"))
public class EmailTemplate extends BaseTenantEntity {

    @Column(nullable = false, length = 64)
    private String code;

    @Column(nullable = false, length = 160)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String bodyWithVars;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getBodyWithVars() { return bodyWithVars; }
    public void setBodyWithVars(String bodyWithVars) { this.bodyWithVars = bodyWithVars; }
}
