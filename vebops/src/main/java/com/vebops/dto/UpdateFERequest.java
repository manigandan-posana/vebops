package com.vebops.dto;

import com.vebops.domain.enums.FEStatus;

/**
 * Request body for updating a Field Engineer's details. Allows changing the
 * display name, contact details and status. Fields are optional; null values
 * indicate no change.
 */
public class UpdateFERequest {
    public String displayName;
    public String email;
    public String mobile;
    public FEStatus status;
}