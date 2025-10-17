package com.vebops.web;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;

import com.vebops.dto.DashboardSummary;
import com.vebops.service.DashboardService;

/**
 * REST controller exposing dashboard summary endpoints for administrators and
 * back office users. Admins receive global statistics while back office users
 * see data scoped to their tenant.
 */
@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboard;

    public DashboardController(DashboardService dashboard) {
        this.dashboard = dashboard;
    }

    /**
     * Returns a summary for the entire system. Accessible to ADMIN or
     * SUPER_ADMIN roles only.
     */
    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<DashboardSummary> adminSummary() {
        return ResponseEntity.ok(dashboard.getAdminSummary());
    }

}