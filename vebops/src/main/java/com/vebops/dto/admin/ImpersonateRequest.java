package com.vebops.dto.admin;

import jakarta.validation.constraints.*;
import com.vebops.domain.enums.RoleCode;

public class ImpersonateRequest {
    @NotNull public Long userId;
    @NotNull public Long tenantId;
    @NotNull public RoleCode role; // role claim to embed
}
