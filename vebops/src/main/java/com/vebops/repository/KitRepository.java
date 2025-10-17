package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.Kit;

@Repository
public interface KitRepository extends JpaRepository<Kit, Long> {
    List<Kit> findByTenantIdAndServiceType(Long tenantId, ServiceTypeCode serviceType);
        List<Kit> findByTenantId(Long tenantId);
}
