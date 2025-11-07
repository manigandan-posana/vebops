package com.vebops.dto.admin;

import jakarta.validation.constraints.*;

public class ExtendSubscriptionRequest {
    @NotNull public Long tenantId;
    @NotNull public Integer days;   // > 0
}
