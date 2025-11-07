package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.StockLedger;

@Repository
public interface StockLedgerRepository extends JpaRepository<StockLedger, Long> {
    List<StockLedger> findByTenantIdAndItem_IdOrderByOccurredAtAsc(Long tenantId, Long itemId);
    List<StockLedger> findByTenantIdAndRefTypeAndRefIdOrderByOccurredAtAsc(Long tenantId, RefType refType, Long refId);
    List<StockLedger> findByTenantIdAndItem_IdAndStore_IdOrderByOccurredAtAsc(Long tenantId, Long itemId, Long storeId);

}
