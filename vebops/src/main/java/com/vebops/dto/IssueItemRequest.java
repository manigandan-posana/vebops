package com.vebops.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class IssueItemRequest {
    @NotNull public Long itemId;
    @NotNull public Long storeId;
    @NotNull @Positive public BigDecimal qty;
}
