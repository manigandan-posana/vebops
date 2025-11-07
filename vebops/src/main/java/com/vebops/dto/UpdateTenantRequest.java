package com.vebops.dto;

/**
 * Request body for updating tenant details. Only non-null fields will be
 * updated by the API.
 */
public class UpdateTenantRequest {
    public String code;
    public String name;
    public Boolean active;
}