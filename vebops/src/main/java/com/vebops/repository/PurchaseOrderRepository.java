package com.vebops.repository;

import com.vebops.domain.PurchaseOrder;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    Page<PurchaseOrder> findByTenantId(Long tenantId, Pageable pageable);
    Page<PurchaseOrder> findByTenantIdAndService_Id(Long tenantId, Long serviceId, Pageable pageable);
    List<PurchaseOrder> findTop10ByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<PurchaseOrder> findTop10ByTenantIdAndSupplierNameContainingIgnoreCase(Long tenantId, String supplierName);
    @Query("select po from PurchaseOrder po where po.tenantId = :tenantId and (" +
            "lower(po.supplierName) like lower(concat('%', :keyword, '%')) or " +
            "lower(po.voucherNumber) like lower(concat('%', :keyword, '%')) or " +
            "lower(po.destination) like lower(concat('%', :keyword, '%')) or " +
            "lower(po.referenceNumberAndDate) like lower(concat('%', :keyword, '%'))" +
            ")")
    List<PurchaseOrder> searchTopByKeyword(@Param("tenantId") Long tenantId,
                                           @Param("keyword") String keyword,
                                           Pageable pageable);
    Optional<PurchaseOrder> findByTenantIdAndId(Long tenantId, Long id);
}
