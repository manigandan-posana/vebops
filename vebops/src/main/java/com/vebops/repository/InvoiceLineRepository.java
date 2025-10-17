package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.InvoiceLine;

@Repository
public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, Long> {
    List<InvoiceLine> findByTenantIdAndInvoice_Id(Long tenantId, Long invoiceId);
    List<InvoiceLine> findByTenantId(Long tenantId);
    List<InvoiceLine> findByInvoice_Id(Long invoiceId);
}
