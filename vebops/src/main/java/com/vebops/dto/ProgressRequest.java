package com.vebops.dto;

import jakarta.validation.constraints.*;

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
     * Optional URL of an uploaded photo for this progress update.
     */
    public String photoUrl;
}
