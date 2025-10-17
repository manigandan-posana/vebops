package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.vebops.domain.Tenant;

// TenantRepository.java
@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

  Optional<Tenant> findByCode(String code);
  List<Tenant> findByActiveTrue();
  long countByCreatedAtAfter(java.time.Instant cutoff);

  interface TenantRowProjection {
    Long getId();
    String getCode();
    String getName();
    Boolean getActive();
    String getLatestStatus();
    java.time.LocalDate getLatestStartsAt();
    java.time.LocalDate getLatestEndsAt();

    // NEW: primary Back Office contact (if any)
    Long getBackOfficeUserId();
    String getBackOfficeEmail();
    String getBackOfficeDisplayName();
  }

  @Query(value = """
    SELECT
      t.id                    AS id,
      t.code                  AS code,
      t.name                  AS name,
      t.active                AS active,
      s.status                AS latestStatus,
      s.starts_at             AS latestStartsAt,
      s.ends_at               AS latestEndsAt,
      u.id                    AS backOfficeUserId,
      u.email                 AS backOfficeEmail,
      u.display_name          AS backOfficeDisplayName
    FROM tenants t
    LEFT JOIN subscriptions s
      ON s.id = (
        SELECT s2.id
        FROM subscriptions s2
        WHERE s2.tenant_id = t.id
        ORDER BY s2.ends_at DESC
        LIMIT 1
      )
    /* primary BACK_OFFICE role on this tenant */
    LEFT JOIN user_roles ur
      ON ur.tenant_id = t.id
     AND ur.role_code = 'BACK_OFFICE'
     AND ur.primary_role = true
    LEFT JOIN users u
      ON u.id = ur.user_id
    WHERE
      (:q IS NULL OR :q = ''
        OR LOWER(t.code) LIKE LOWER(CONCAT('%', :q, '%'))
        OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
      AND (:active IS NULL OR t.active = :active)
      AND (
        :sub IS NULL OR :sub = '' OR
        (:sub = 'ACTIVE'   AND s.status = 'ACTIVE'   AND (s.ends_at IS NULL OR s.ends_at >= CURRENT_DATE)) OR
        (:sub = 'INACTIVE' AND (s.status = 'INACTIVE' OR s.id IS NULL)) OR
        (:sub = 'EXPIRED'  AND s.ends_at < CURRENT_DATE)
      )
    /* ---- dynamic, SAFE ordering (field whitelist + direction) ---- */
    ORDER BY
      CASE WHEN :sortField = 'name'  THEN t.name END  /* asc/desc applied below */,
      CASE WHEN :sortField = 'code'  THEN t.code END,
      CASE WHEN :sortField = 'id'    THEN t.id   END,
      t.id
    """,
    countQuery = """
    SELECT COUNT(*)
    FROM tenants t
    LEFT JOIN subscriptions s
      ON s.id = (
        SELECT s2.id
        FROM subscriptions s2
        WHERE s2.tenant_id = t.id
        ORDER BY s2.ends_at DESC
        LIMIT 1
      )
    WHERE
      (:q IS NULL OR :q = ''
        OR LOWER(t.code) LIKE LOWER(CONCAT('%', :q, '%'))
        OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%')))
      AND (:active IS NULL OR t.active = :active)
      AND (
        :sub IS NULL OR :sub = '' OR
        (:sub = 'ACTIVE'   AND s.status = 'ACTIVE'   AND (s.ends_at IS NULL OR s.ends_at >= CURRENT_DATE)) OR
        (:sub = 'INACTIVE' AND (s.status = 'INACTIVE' OR s.id IS NULL)) OR
        (:sub = 'EXPIRED'  AND s.ends_at < CURRENT_DATE)
      )
    """,
    nativeQuery = true)
  Page<TenantRowProjection> searchTenantsWithLatest(
      @Param("q") String q,
      @Param("active") Boolean active,
      @Param("sub") String sub,
      // NEW: explicit sort field+dir so we don't rely on Pageable sort
      @Param("sortField") String sortField,   // 'name' | 'code' | 'id'
      @Param("sortDir") String sortDir,       // 'asc' | 'desc'
      Pageable pageable                       // pass UNSORTED here
  );
}
