package com.vebops.dto;

import jakarta.validation.constraints.*;

public class CreateFERequest {
    @NotBlank public String displayName;
    @Email @NotBlank public String email;
}
