package com.vebops.dto;

import jakarta.validation.constraints.*;

public class LoginRequest {
    @Email @NotBlank public String email;
    @NotBlank public String password;
    public String preferredRole; // optional ADMIN|BACK_OFFICE|FE|CUSTOMER
}
