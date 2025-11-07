package com.vebops.dto;

import jakarta.validation.constraints.*;

public class CreateTenantRequest {
    @NotBlank public String code;
    @NotBlank public String name;
}