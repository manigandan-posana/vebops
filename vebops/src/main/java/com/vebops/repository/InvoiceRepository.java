package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.Invoice;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByTenantIdAndInvoiceNo(Long tenantId, String invoiceNo);
        List<Invoice> findByTenantIdAndStatus(Long tenantId, InvoiceStatus status);
        List<Invoice> findByTenantIdAndCustomer_Id(Long tenantId, Long customerId);

    long countByStatus(InvoiceStatus status);
    long countByTenantIdAndStatus(Long tenantId, InvoiceStatus status);

    @Query("select coalesce(sum(i.total),0) from Invoice i where i.status = :status")
    java.math.BigDecimal sumTotalByStatus(@Param("status") InvoiceStatus status);

    @Query("select coalesce(sum(i.total),0) from Invoice i where i.tenantId = :tenantId and i.status = :status")
    java.math.BigDecimal sumTotalByTenantAndStatus(@Param("tenantId") Long tenantId, @Param("status") InvoiceStatus status);

    @Query("select coalesce(sum(i.total),0) from Invoice i where i.status = :status and i.createdAt >= :cutoff")
    BigDecimal sumTotalByStatusAndCreatedAtAfter(@Param("status") com.vebops.domain.enums.InvoiceStatus status,
                                             @Param("cutoff") Instant cutoff);
    // add this method
    Optional<Invoice> findByTenantIdAndWorkOrder_Id(Long tenantId, Long workOrderId);

}
