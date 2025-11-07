package com.vebops.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.FieldEngineer;

@Repository
public interface FieldEngineerRepository extends JpaRepository<FieldEngineer, Long> {
    List<FieldEngineer> findByTenantId(Long tenantId);
    List<FieldEngineer> findByTenantIdAndStatus(Long tenantId, FEStatus status);
    @EntityGraph(attributePaths = "user") // join user to avoid lazy proxy at mapping time
    Page<FieldEngineer> findByTenantId(Long tenantId, Pageable pageable);

    @EntityGraph(attributePaths = "user")
    Page<FieldEngineer> findByTenantIdAndStatus(Long tenantId, FEStatus status, Pageable pageable);
    boolean existsByTenantIdAndUserId(Long tenantId, Long userId);
    long countByUserId(Long userId);
    java.util.Optional<FieldEngineer> findFirstByTenantIdAndUser_Id(Long tenantId, Long userId);
}
