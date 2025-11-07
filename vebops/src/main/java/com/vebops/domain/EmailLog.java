package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import com.vebops.domain.enums.EmailEntityType;

@Entity
@Table(name = "email_log",
    indexes = @Index(name = "idx_email_log_tenant", columnList = "tenant_id"))
public class EmailLog extends BaseTenantEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private EmailEntityType entityType;

    @Column(nullable = false)
    private Long entityId;

    @Column(nullable = false, length = 190)
    private String toEmail;

    @Column(nullable = false, length = 160)
    private String subject;

    @Column(nullable = false)
    private boolean viaAi = false;

    @Column(nullable = false)
    private Instant sentAt = Instant.now();

    @Column(columnDefinition = "TEXT")
    private String body;

    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public EmailEntityType getEntityType() { return entityType; }
    public void setEntityType(EmailEntityType entityType) { this.entityType = entityType; }
    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }
    public String getToEmail() { return toEmail; }
    public void setToEmail(String toEmail) { this.toEmail = toEmail; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public boolean isViaAi() { return viaAi; }
    public void setViaAi(boolean viaAi) { this.viaAi = viaAi; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
}
