package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.KitItem;

@Repository
public interface KitItemRepository extends JpaRepository<KitItem, Long> {
    List<KitItem> findByTenantIdAndKit_Id(Long tenantId, Long kitId);
}
