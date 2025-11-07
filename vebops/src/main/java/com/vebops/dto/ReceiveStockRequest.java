package com.vebops.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class ReceiveStockRequest {
    @NotNull public Long itemId;
    @NotNull public Long storeId;
    @NotNull @Positive public BigDecimal qty;
    @Positive public BigDecimal unitCost;
    public Long refProcId;
}
