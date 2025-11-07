package com.vebops.dto.admin;

import jakarta.validation.constraints.*;
import com.vebops.domain.enums.RoleCode;

public class RoleChangeRequest {
    @NotNull public Long tenantId;
    @NotNull public RoleCode role;
    public Boolean primary = Boolean.FALSE;
}
