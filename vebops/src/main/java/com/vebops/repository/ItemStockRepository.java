package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.ItemStock;

@Repository
public interface ItemStockRepository extends JpaRepository<ItemStock, Long> {
    Optional<ItemStock> findByTenantIdAndItem_IdAndStore_Id(Long tenantId, Long itemId, Long storeId);
        List<ItemStock> findByTenantIdAndItem_Id(Long tenantId, Long itemId);
        List<ItemStock> findByTenantIdAndStore_Id(Long tenantId, Long storeId);
        List<ItemStock> findByTenantId(Long tenantId);  
}
