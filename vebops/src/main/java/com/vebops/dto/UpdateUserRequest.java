package com.vebops.dto;

/**
 * Request body for updating a user's basic details. Only the provided
 * properties will be updated. If a field is null it will be ignored.
 */
public class UpdateUserRequest {
    public String displayName;
    public String email;
    public Boolean active;
}