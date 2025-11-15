package com.vebops.repository;

import com.vebops.domain.PurchaseOrderLine;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseOrderLineRepository extends JpaRepository<PurchaseOrderLine, Long> {
    List<PurchaseOrderLine> findByTenantIdAndPurchaseOrder_IdOrderByLineNumberAsc(Long tenantId, Long purchaseOrderId);
    void deleteByTenantIdAndPurchaseOrder_Id(Long tenantId, Long purchaseOrderId);
}
