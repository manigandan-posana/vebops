package com.vebops.domain;

import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "work_order_progress_attachments",
    indexes = {
        @Index(name = "idx_wo_prog_attachment_tenant", columnList = "tenant_id"),
        @Index(name = "idx_wo_prog_attachment_progress", columnList = "progress_id")
    }
)
public class WorkOrderProgressAttachment extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "progress_id", nullable = false)
    @JsonIgnore
    private WorkOrderProgress progress;

    @Column(nullable = false, length = 160)
    private String filename;

    @Column(nullable = false, length = 120)
    private String contentType;

    @Column(nullable = false)
    private Long size;

    @Lob
    @Basic(fetch = FetchType.LAZY)
    @JsonIgnore
    private byte[] data;

    @Column(nullable = false)
    private Instant uploadedAt = Instant.now();

    public WorkOrderProgress getProgress() {
        return progress;
    }

    public void setProgress(WorkOrderProgress progress) {
        this.progress = progress;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getSize() {
        return size;
    }

    public void setSize(Long size) {
        this.size = size;
    }

    public byte[] getData() {
        return data;
    }

    public void setData(byte[] data) {
        this.data = data;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(Instant uploadedAt) {
        this.uploadedAt = uploadedAt;
    }
}
