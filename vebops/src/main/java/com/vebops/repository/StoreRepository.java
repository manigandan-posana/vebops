package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.Store;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {
    List<Store> findByTenantId(Long tenantId);
        Optional<Store> findByTenantIdAndName(Long tenantId, String name);
}
