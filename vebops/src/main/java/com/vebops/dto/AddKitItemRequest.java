package com.vebops.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class AddKitItemRequest {
    @NotNull public Long tenantId;
    @NotNull public Long kitId;
    @NotNull public Long itemId;
    @NotNull @Positive public BigDecimal qty;
}
