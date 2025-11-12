package com.vebops.dto;

import java.util.Base64;

import jakarta.validation.constraints.*;

import com.vebops.service.WorkOrderService;

public class ProgressRequest {
    @NotBlank
    /**
     * Status of the progress update.  Valid values are ASSIGNED, ACCEPTED,
     * STARTED, MATERIAL_RECEIVED, INSTALLATION_STARTED or COMPLETED.  The
     * combination of progress status and associated WorkOrder status
     * transitions is managed in WorkOrderService.
     */
    public String status;

    public Long byFeId;

    /**
     * Optional remarks accompanying the progress update.
     */
    public String remarks;

    /**
     * Optional URL of an uploaded photo for legacy clients. When file data is provided this field is ignored.
     */
    public String photoUrl;

    /**
     * Original filename of the uploaded photo.
     */
    @Size(max = 160)
    public String photoName;

    /**
     * Reported MIME type of the uploaded photo.
     */
    @Size(max = 120)
    public String photoContentType;

    /**
     * Reported size of the uploaded photo in bytes.
     */
    public Long photoSize;

    /**
     * Base64 encoded payload of the uploaded photo.
     */
    public String photoData;

    public WorkOrderService.ProgressAttachment toAttachment() {
        if (photoData == null || photoData.isBlank()) {
            return null;
        }
        byte[] data;
        try {
            data = Base64.getDecoder().decode(photoData);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid progress photo payload");
        }
        String filename = (photoName != null && !photoName.trim().isEmpty()) ? photoName.trim() : "progress-photo";
        String contentType = (photoContentType != null && !photoContentType.trim().isEmpty())
                ? photoContentType.trim()
                : "application/octet-stream";
        Long size = photoSize != null ? photoSize : Long.valueOf(data.length);
        return new WorkOrderService.ProgressAttachment(filename, contentType, size, data);
    }
}
