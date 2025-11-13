package com.vebops.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.vebops.domain.Kit;
import com.vebops.domain.enums.ServiceTypeCode;

@Repository
public interface KitRepository extends JpaRepository<Kit, Long> {
    List<Kit> findByTenantIdAndServiceType(Long tenantId, ServiceTypeCode serviceType);
    List<Kit> findByTenantId(Long tenantId);
    Page<Kit> findByTenantId(Long tenantId, Pageable pageable);

    @Query("select k from Kit k where k.tenantId = :tenantId and (" +
           "lower(k.name) like lower(concat('%', :keyword, '%')) or " +
           "lower(coalesce(k.code, '')) like lower(concat('%', :keyword, '%')) or " +
           "lower(coalesce(k.description, '')) like lower(concat('%', :keyword, '%')) or " +
           "lower(coalesce(k.brand, '')) like lower(concat('%', :keyword, '%')))")
    Page<Kit> searchByKeyword(@Param("tenantId") Long tenantId,
                              @Param("keyword") String keyword,
                              Pageable pageable);
}
