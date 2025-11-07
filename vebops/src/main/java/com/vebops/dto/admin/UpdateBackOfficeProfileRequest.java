package com.vebops.dto.admin;
/**
 * Edit both the Backoffice user and its tenant in one request.
 * All fields are optional; only non-null & non-blank values are applied.
 * If tenantId is omitted, the API will auto-detect the tenant from the user's BACK_OFFICE role.
 */
public class UpdateBackOfficeProfileRequest {
    public Long tenantId;        // optional disambiguation if user has BACK_OFFICE on multiple tenants

    // Tenant fields
    public String code;          // new tenant code
    public String name;          // new tenant name

    // User fields
    public String displayName;
    public String email;
}
