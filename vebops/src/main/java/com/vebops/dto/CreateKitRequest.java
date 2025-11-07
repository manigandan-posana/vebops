package com.vebops.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import com.vebops.domain.enums.ServiceTypeCode;

public class CreateKitRequest {
    /**
     * Deprecated: the tenant ID is now derived from the security context. This
     * field will be ignored by the service layer if provided.
     */
    public Long tenantId;
    @NotBlank public String name;
    public String description;
    @NotNull public ServiceTypeCode serviceType;
    @NotNull @Positive public BigDecimal price;

    /**
     * Alternative price field used by some importers. When deserialising JSON,
     * assigning a value to basePrice will automatically populate {@link #price}
     * if {@code price} itself is absent. This setter is used by Jackson and
     * ignored elsewhere. See {@link com.fasterxml.jackson.annotation.JsonProperty}.
     */
    @com.fasterxml.jackson.annotation.JsonProperty("basePrice")
    public void setBasePrice(BigDecimal basePrice) {
        // Only set if price has not already been assigned. This prevents
        // basePrice from overwriting an explicitly provided price field.
        if (this.price == null) {
            this.price = basePrice;
        }
    }
    /** Optional unique code. If omitted a value will be generated. */
    public String code;
    /** Optional HSN/SAC code. If omitted will default to 854690. */
    public String hsnSac;
    public String brand;
    public String voltageKV;
    public String cores;
    public Integer sizeSqmm;
    public String category;
    public String material;
}
