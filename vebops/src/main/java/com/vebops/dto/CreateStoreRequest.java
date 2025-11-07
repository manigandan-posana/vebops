package com.vebops.dto;

import jakarta.validation.constraints.*;

public class CreateStoreRequest {
    @NotNull public Long tenantId;
    @NotBlank public String name;
    @NotBlank public String location;
}
