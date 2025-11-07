package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.UserRole;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    List<UserRole> findByTenantId(Long tenantId);
    List<UserRole> findByUser_IdAndTenantId(Long userId, Long tenantId);
    List<UserRole> findByTenantIdAndRoleCode(Long tenantId, RoleCode roleCode);
    List<UserRole> findByUser_Id(Long userId);
    boolean existsByUser_IdAndTenantIdAndRoleCode(Long userId, Long tenantId, RoleCode roleCode);
    // add:
    void deleteByUser_IdAndTenantId(Long userId, Long tenantId);
}
