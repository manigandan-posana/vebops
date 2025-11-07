package com.vebops.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Request body for initiating a password reset. Contains the email of the
 * account that needs to reset its password.
 */
public class ForgotPasswordRequest {
    @NotBlank
    @Email
    public String email;
}