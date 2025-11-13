package com.vebops.repository;

import com.vebops.domain.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long> {
    // Find services belonging to a tenant with pagination. This is used to
    // support service history listing in the back office. Spring Data will
    // derive the query automatically from the method name.
    org.springframework.data.domain.Page<Service> findByTenantId(Long tenantId,
                                                                org.springframework.data.domain.Pageable pageable);

    /**
     * Search for services belonging to a tenant using a keyword. The keyword is
     * matched against the buyer name, buyer GSTIN, buyer contact, and
     * consignee name fields. The search is case‑insensitive and uses a
     * simple LIKE pattern. This method supports pagination and returns a
     * page of results. When no matches are found an empty page is returned.
     */
    @org.springframework.data.jpa.repository.Query("""
        SELECT s FROM Service s
        WHERE s.tenantId = :tenantId AND (
              LOWER(COALESCE(s.buyerName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(s.buyerGst, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(s.buyerContact, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(s.buyerEmail, ''))   LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(s.consigneeName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
        )
    """)
    org.springframework.data.domain.Page<Service> searchByTenantIdAndKeyword(
        @org.springframework.data.repository.query.Param("tenantId") Long tenantId,
        @org.springframework.data.repository.query.Param("keyword") String keyword,
        org.springframework.data.domain.Pageable pageable);

    /**
     * Fetch the most recent services for a tenant ordered by creation timestamp. This is
     * primarily used when attempting to resolve contextual links (service request / work
     * order) without issuing broad LIKE queries on the meta JSON column.
     */
    java.util.List<Service> findTop50ByTenantIdOrderByCreatedAtDesc(Long tenantId);

    java.util.Optional<Service> findByTenantIdAndId(Long tenantId, Long id);
}