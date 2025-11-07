package com.vebops.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.vebops.domain.CompanyDetails;

/**
 * Repository for tenant‑scoped company details. Only one record should
 * exist per tenant; the findByTenantId method is used by the controller
 * to load or create a profile.
 */
@Repository
public interface CompanyDetailsRepository extends JpaRepository<CompanyDetails, Long> {
    Optional<CompanyDetails> findByTenantId(Long tenantId);
}