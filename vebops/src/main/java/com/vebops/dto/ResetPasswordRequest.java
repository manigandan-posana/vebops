package com.vebops.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for resetting the password using a token. Contains the reset
 * token and the new password chosen by the user.
 */
public class ResetPasswordRequest {
    @NotBlank
    public String token;
    @NotBlank
    public String newPassword;
}