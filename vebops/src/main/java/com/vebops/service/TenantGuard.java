package com.vebops.service;

public interface TenantGuard {
    void assertActive(Long tenantId);
}
