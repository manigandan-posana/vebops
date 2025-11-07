package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.domain.enums.DocumentEntityType;

@Entity
@Table(name = "documents",
    indexes = {
        @Index(name = "idx_doc_tenant", columnList = "tenant_id"),
        @Index(name = "idx_doc_entity", columnList = "entityType,entityId")
    }
)
public class Document extends BaseTenantEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private DocumentKind kind;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private DocumentEntityType entityType;

    @Column(nullable = false)
    private Long entityId;

    @Lob
    @Column(nullable = true)
    private String url;

    @Column(length = 160)
    private String filename;

    @Column(nullable = false)
    private Instant uploadedAt = Instant.now();

    public DocumentKind getKind() { return kind; }
    public void setKind(DocumentKind kind) { this.kind = kind; }
    public DocumentEntityType getEntityType() { return entityType; }
    public void setEntityType(DocumentEntityType entityType) { this.entityType = entityType; }
    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }
    public Instant getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(Instant uploadedAt) { this.uploadedAt = uploadedAt; }
}
