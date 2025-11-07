package com.vebops.dto.admin;

public record RoleDto(
  String role, Long tenantId, boolean primary
) {}