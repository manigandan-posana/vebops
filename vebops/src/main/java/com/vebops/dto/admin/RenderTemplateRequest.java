package com.vebops.dto.admin;

import jakarta.validation.constraints.*;
import java.util.Map;

public class RenderTemplateRequest {
    @NotNull public Long tenantId;
    @NotBlank public String code;
    public Map<String, Object> vars;
    public Boolean viaAi = Boolean.FALSE;
}
