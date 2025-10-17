package com.vebops.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import com.vebops.domain.enums.ServiceTypeCode;

public class CreateKitRequest {
    @NotNull public Long tenantId;
    @NotBlank public String name;
    public String description;
    @NotNull public ServiceTypeCode serviceType;
    @NotNull @Positive public BigDecimal price;
}
