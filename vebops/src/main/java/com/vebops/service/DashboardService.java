package com.vebops.service;

import com.vebops.dto.DashboardSummary;

/**
 * Dashboard service exposes methods to compute aggregate statistics for
 * administrators and back office users. Implementations must respect tenant
 * scoping (for non-admins) and only aggregate data the caller is permitted
 * to view.
 */
public interface DashboardService {
    /**
     * Computes global summary statistics across all tenants. Only callable by
     * users with the ADMIN or SUPER_ADMIN role.
     *
     * @return a {@link DashboardSummary} containing counts and revenue
     */
    DashboardSummary getAdminSummary();

    /**
     * Computes summary statistics for a single tenant. Only callable by back
     * office users for their own tenant.
     *
     * @param tenantId the tenant identifier
     * @return a {@link DashboardSummary}
     */
    DashboardSummary getTenantSummary(Long tenantId);
}