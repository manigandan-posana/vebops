package com.vebops.web;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import com.vebops.dto.UpdateUserRequest;
import com.vebops.dto.UpdateTenantRequest;
import com.vebops.dto.admin.AdminSummaryResponse;
import com.vebops.dto.admin.BackOfficeProfileResponse;
import com.vebops.dto.admin.ExtendSubscriptionRequest;
import com.vebops.dto.admin.ImpersonateRequest;
import com.vebops.dto.admin.ImpersonateResponse;
import com.vebops.dto.admin.InviteUserRequest;
import com.vebops.dto.admin.PageResponse;
import com.vebops.dto.admin.RenderTemplateRequest;
import com.vebops.dto.admin.ResetPasswordRequest;
import com.vebops.dto.admin.RevenueSeriesResponse;
import com.vebops.dto.admin.RoleChangeRequest;
import com.vebops.dto.admin.SubscriptionBreakdownResponse;
import com.vebops.dto.admin.SystemHealthResponse;
import com.vebops.dto.admin.TenantListItem;
import com.vebops.dto.admin.TenantProfileResponse;
import com.vebops.dto.admin.UpdateBackOfficeProfileRequest;
import com.vebops.dto.admin.UpsertEmailTemplateRequest;
import com.vebops.dto.CreateBackOfficeUserRequest;
import com.vebops.dto.UpdateSubscriptionRequest;
import com.vebops.domain.EmailTemplate;
import com.vebops.domain.Tenant;
import com.vebops.domain.User;
import com.vebops.domain.enums.RoleCode;
import com.vebops.dto.DashboardSummary;
import com.vebops.service.AdminService;

/**
 * Thin REST controller delegating all business logic to {@link AdminService}.
 * This controller simply maps HTTP endpoints to service methods without
 * performing any domain logic. Transactional boundaries are defined in
 * the service layer.
 */
@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ---------- User management ----------

    @PatchMapping("/users/{id}")
    public ResponseEntity<Void> updateUser(@PathVariable Long id, @RequestBody UpdateUserRequest req) {
        return adminService.updateUser(id, req);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> disableUser(@PathVariable Long id) {
        return adminService.disableUser(id);
    }

    @PutMapping("/subscription")
    public ResponseEntity<Long> upsertSubscription(@RequestBody UpdateSubscriptionRequest req) {
        return adminService.upsertSubscription(req);
    }

    // ---------- Back Office users ----------

    @PostMapping("/users/backoffice")
    public ResponseEntity<Long> createBackOfficeUser(@RequestBody CreateBackOfficeUserRequest req) {
        return adminService.createBackOfficeUser(req);
    }

    // ---------- Optional: simple lookups ----------

    @GetMapping("/users")
    public ResponseEntity<List<User>> listUsers() {
        return adminService.listUsers();
    }

    @PutMapping("/tenants/{id}")
    public ResponseEntity<Tenant> updateTenant(@PathVariable Long id, @RequestBody UpdateTenantRequest req) {
        return adminService.updateTenant(id, req);
    }

    @GetMapping("/dashboard/summary")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<AdminSummaryResponse> adminDashboardSummary() {
        return adminService.adminDashboardSummary();
    }

    @GetMapping("/subscriptions/breakdown")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SubscriptionBreakdownResponse> subscriptionBreakdown() {
        return adminService.subscriptionBreakdown();
    }

    @GetMapping("/tenants/signups")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Long> tenantSignups(
            @RequestParam(name = "sinceDays", defaultValue = "30") int sinceDays) {
        return adminService.tenantSignups(sinceDays);
    }

    @GetMapping("/health")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public ResponseEntity<SystemHealthResponse> systemHealth() {
        return adminService.systemHealth();
    }

    // ---------- Admin Utilities ----------

    @PostMapping("/users/invite")
    public ResponseEntity<Long> inviteUser(@RequestBody @Valid InviteUserRequest req) {
        return adminService.inviteUser(req);
    }

    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable Long id, @RequestBody(required=false) ResetPasswordRequest body) {
        return adminService.resetPassword(id, body);
    }

    @PostMapping("/users/{id}/roles")
    public ResponseEntity<Void> addRole(@PathVariable Long id, @RequestBody @Valid RoleChangeRequest req) {
        return adminService.addRole(id, req);
    }

    @DeleteMapping("/users/{id}/roles")
    public ResponseEntity<Void> removeRole(@PathVariable Long id,
            @RequestParam Long tenantId, @RequestParam RoleCode role) {
        return adminService.removeRole(id, tenantId, role);
    }

    @PutMapping("/subscription/extend")
    public ResponseEntity<Long> extendSubscription(@RequestBody @Valid ExtendSubscriptionRequest req) {
        return adminService.extendSubscription(req);
    }

    @GetMapping("/billing/revenue-series")
    public ResponseEntity<RevenueSeriesResponse> revenueSeries(
            @RequestParam(name="months", defaultValue="6") int months) {
        return adminService.revenueSeries(months);
    }

    @GetMapping(value="/export/users.csv", produces="text/csv")
    public ResponseEntity<byte[]> exportUsersCsv() {
        return adminService.exportUsersCsv();
    }

    @GetMapping(value="/export/tenants.csv", produces="text/csv")
    public ResponseEntity<byte[]> exportTenantsCsv() {
        return adminService.exportTenantsCsv();
    }

    // 7) Email templates – list, upsert, preview render
    @GetMapping("/email/templates")
    public ResponseEntity<List<EmailTemplate>> listTemplates(@RequestParam Long tenantId) {
        return adminService.listTemplates(tenantId);
    }

    @PutMapping("/email/templates")
    public ResponseEntity<Long> upsertTemplate(@RequestBody @Valid UpsertEmailTemplateRequest req) {
        return adminService.upsertTemplate(req);
    }

    @PostMapping("/email/templates/render")
    public ResponseEntity<String> renderTemplate(@RequestBody @Valid RenderTemplateRequest req) {
        return adminService.renderTemplate(req);
    }

    // 8) Impersonate (SUPER_ADMIN only)
    @PostMapping("/impersonate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ImpersonateResponse> impersonate(@RequestBody @Valid ImpersonateRequest req) {
        return adminService.impersonate(req);
    }

    @GetMapping("/office")
    @PreAuthorize("hasAnyRole('BACK_OFFICE','ADMIN','SUPER_ADMIN')")
    public ResponseEntity<DashboardSummary> tenantSummary() {
        return adminService.tenantSummary();
    }

    // ---------- Tenants (paged + filters) ----------
    @GetMapping("/tenants")
    public ResponseEntity<PageResponse<TenantListItem>> listTenantsPaged(
        @RequestParam(name="page", defaultValue = "0") int page,
        @RequestParam(name="size", defaultValue = "10") int size,
        @RequestParam(name="q", required = false) String q,
        @RequestParam(name="active", required = false) Boolean active,
        @RequestParam(name="sub", required = false) String sub,
        @RequestParam(name="sort", defaultValue = "name,asc") String sort
    ) {
        return adminService.listTenantsPaged(page, size, q, active, sub, sort);
    }

    @GetMapping("/tenants/{id}")
    public ResponseEntity<TenantProfileResponse> getTenantById(@PathVariable Long id) {
        return adminService.getTenantById(id);
    }

    @GetMapping("/tenants/{tenantId}/{kind:customers|field-engineers}")
    public ResponseEntity<?> listTenantMembers(
            @PathVariable Long tenantId,
            @PathVariable String kind,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) Boolean hasPortal,
            @RequestParam(defaultValue = "ALL") String status,
            @RequestParam(defaultValue = "id,desc") String sort
    ) {
        return adminService.listTenantMembers(tenantId, kind, page, size, q, hasPortal, status, sort);
    }

    @PatchMapping("/users/backoffice/{userId}")
    public ResponseEntity<BackOfficeProfileResponse> updateBackOfficeProfile(
            @PathVariable Long userId,
            @RequestBody UpdateBackOfficeProfileRequest req) {
        return adminService.updateBackOfficeProfile(userId, req);
    }

    @GetMapping("/tenants/{tenantId}/delete-preview")
    public ResponseEntity<Map<String, Long>> previewTenantDeletion(@PathVariable Long tenantId) {
        return adminService.previewTenantDeletion(tenantId);
    }

    @DeleteMapping("/tenants/{tenantId}")
    public ResponseEntity<Void> deleteTenant(
            @PathVariable Long tenantId,
            @RequestParam(name = "deleteOrphanUsers", defaultValue = "true") boolean deleteOrphanUsers) {
        return adminService.deleteTenant(tenantId, deleteOrphanUsers);
    }

    @DeleteMapping("/customers/{customerId}")
    public ResponseEntity<Void> deleteCustomer(
            @PathVariable Long customerId,
            @RequestParam(defaultValue = "true") boolean deletePortalUserIfOrphan) {
        return adminService.deleteCustomer(customerId, deletePortalUserIfOrphan);
    }

    @DeleteMapping("/field-engineers/{feId}")
    public ResponseEntity<Void> deleteFieldEngineer(
            @PathVariable Long feId,
            @RequestParam(defaultValue = "true") boolean deleteUserIfOrphan) {
        return adminService.deleteFieldEngineer(feId, deleteUserIfOrphan);
    }
}