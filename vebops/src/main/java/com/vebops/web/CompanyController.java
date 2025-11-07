package com.vebops.web;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.vebops.context.TenantContext;
import com.vebops.domain.CompanyDetails;
import com.vebops.repository.CompanyDetailsRepository;

/**
 * REST controller for managing the tenant‑specific company profile. Back office
 * users can read and update their own company details via these endpoints.
 */
@RestController
@RequestMapping("/office/company")
@PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE')")
public class CompanyController {

    private final CompanyDetailsRepository repo;

    public CompanyController(CompanyDetailsRepository repo) {
        this.repo = repo;
    }

    /**
     * Retrieve the current tenant's company profile. If no profile exists
     * yet a new empty instance is returned (id will be null) so that the
     * front‑end can still bind to a model.
     */
    @GetMapping
    public ResponseEntity<CompanyDetails> getCompany() {
        Long tenantId = TenantContext.getTenantId();
        CompanyDetails cd = repo.findByTenantId(tenantId).orElseGet(() -> {
            CompanyDetails c = new CompanyDetails();
            c.setTenantId(tenantId);
            return c;
        });
        return ResponseEntity.ok(cd);
    }

    /**
     * Update or create the current tenant's company profile. Accepts a map
     * containing any subset of CompanyDetails fields. Unknown keys are
     * ignored. Returns the updated entity.
     */
    @PutMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<CompanyDetails> updateCompany(@RequestBody Map<String, Object> body) {
        Long tenantId = TenantContext.getTenantId();
        CompanyDetails cd = repo.findByTenantId(tenantId).orElseGet(() -> {
            CompanyDetails c = new CompanyDetails();
            c.setTenantId(tenantId);
            return c;
        });
        // Map keys to entity setters
        if (body.containsKey("name")) cd.setName((String) body.get("name"));
        if (body.containsKey("phone")) cd.setPhone((String) body.get("phone"));
        if (body.containsKey("email")) cd.setEmail((String) body.get("email"));
        if (body.containsKey("website")) cd.setWebsite((String) body.get("website"));
        if (body.containsKey("state")) cd.setState((String) body.get("state"));
        if (body.containsKey("stateCode")) cd.setStateCode((String) body.get("stateCode"));
        if (body.containsKey("gstin")) cd.setGstin((String) body.get("gstin"));
        if (body.containsKey("pan")) cd.setPan((String) body.get("pan"));
        if (body.containsKey("bankName")) cd.setBankName((String) body.get("bankName"));
        if (body.containsKey("accNo")) cd.setAccNo((String) body.get("accNo"));
        if (body.containsKey("branch")) cd.setBranch((String) body.get("branch"));
        if (body.containsKey("ifsc")) cd.setIfsc((String) body.get("ifsc"));
        if (body.containsKey("addressLine1")) cd.setAddressLine1((String) body.get("addressLine1"));
        if (body.containsKey("addressLine2")) cd.setAddressLine2((String) body.get("addressLine2"));
        // Accept both `logo` and `logoDataUrl` for backwards/forwards compatibility. The
        // front‑end uses logoDataUrl to represent the base64 data URL while the
        // existing API expected a field named logo. Map either one to the
        // underlying entity property.
        if (body.containsKey("logo") || body.containsKey("logoDataUrl")) {
            Object val = body.get("logo");
            if (val == null) {
                val = body.get("logoDataUrl");
            }
            String logoStr = val != null ? val.toString() : null;
            // If the client sends an empty string, treat it as removal of the logo
            if (logoStr != null && logoStr.isBlank()) {
                logoStr = null;
            }
            cd.setLogoDataUrl(logoStr);
        }
        // Persist and return
        CompanyDetails saved = repo.save(cd);
        return ResponseEntity.ok(saved);
    }
}