package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.Item;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {
    Optional<Item> findByTenantIdAndCode(Long tenantId, String code);
        List<Item> findByTenantIdAndNameContainingIgnoreCase(Long tenantId, String name);
        List<Item> findByTenantId(Long tenantId);
}
