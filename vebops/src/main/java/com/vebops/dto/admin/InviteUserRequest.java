package com.vebops.dto.admin;


import jakarta.validation.constraints.*;
import com.vebops.domain.enums.RoleCode;

public class InviteUserRequest {
    @NotNull public Long tenantId;
    @NotBlank public String displayName;
    @Email @NotBlank public String email;
    @NotNull public RoleCode role;          // ADMIN | BACK_OFFICE | FE | CUSTOMER
    public Boolean primaryRole = Boolean.TRUE;
}
