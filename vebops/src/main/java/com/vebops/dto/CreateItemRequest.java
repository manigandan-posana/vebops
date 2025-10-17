package com.vebops.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class CreateItemRequest {
    @NotNull public Long tenantId;
    @NotBlank public String code;
    @NotBlank public String name;
    @NotBlank public String uom;
    @NotNull @Positive public BigDecimal rate;

    // NEW
    public String spec;
    @DecimalMin(value = "0.00") @DecimalMax(value = "100.00")
    public BigDecimal taxPercent;
    public String hsnSac;
    public String rateType; // "STANDARD" or "AVG"
}
