package com.vebops.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import com.vebops.domain.enums.SubscriptionStatus;

public class UpdateSubscriptionRequest {
    @NotNull public Long tenantId;
    @NotNull public LocalDate startsAt;
    @NotNull public LocalDate endsAt;
    @NotNull public SubscriptionStatus status;
}
