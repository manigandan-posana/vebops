package com.vebops.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.Customer;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByTenantIdAndEmailIgnoreCase(Long tenantId, String email);
    List<Customer> findByTenantIdAndNameContainingIgnoreCase(Long tenantId, String name);
    List<Customer> findByTenantId(Long tenantId);
    Optional<Customer> findByTenantIdAndMobile(Long tenantId, String mobile);
    boolean existsByTenantIdAndEmailIgnoreCase(Long tenantId, String email);

     @EntityGraph(attributePaths = "portalUser")
    Page<Customer> findByTenantId(Long tenantId, Pageable pageable);

    @EntityGraph(attributePaths = "portalUser")
    Page<Customer> findByTenantIdAndNameContainingIgnoreCase(Long tenantId, String name, Pageable pageable);

    @EntityGraph(attributePaths = "portalUser")
    Page<Customer> findByTenantIdAndEmailIgnoreCase(Long tenantId, String email, Pageable pageable);

    @EntityGraph(attributePaths = "portalUser")
    Page<Customer> findByTenantIdAndMobile(Long tenantId, String mobile, Pageable pageable);

    // Optional: quick filter to show only customers with/without portal users
    @EntityGraph(attributePaths = "portalUser")
    Page<Customer> findByTenantIdAndPortalUserIsNotNull(Long tenantId, Pageable pageable);

    @EntityGraph(attributePaths = "portalUser")
    Page<Customer> findByTenantIdAndPortalUserIsNull(Long tenantId, Pageable pageable);

    boolean existsByTenantIdAndPortalUserId(Long tenantId, Long userId);
    long countByPortalUserId(Long userId);

    Optional<Customer> findByTenantIdAndPortalUser_Id(Long tenantId, Long userId);
}
