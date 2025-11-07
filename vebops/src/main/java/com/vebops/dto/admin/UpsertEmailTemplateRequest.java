package com.vebops.dto.admin;

import jakarta.validation.constraints.*;

public class UpsertEmailTemplateRequest {
    @NotNull public Long tenantId;
    @NotBlank public String code;
    @NotBlank public String subject;
    @NotBlank public String bodyWithVars;
}
