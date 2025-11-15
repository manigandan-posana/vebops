package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.WorkOrderProgress;

@Repository
public interface WorkOrderProgressRepository extends JpaRepository<WorkOrderProgress, Long> {
    List<WorkOrderProgress> findByTenantIdAndWorkOrder_IdOrderByCreatedAtAsc(Long tenantId, Long woId);

    Optional<WorkOrderProgress> findTop1ByTenantIdAndWorkOrder_IdOrderByCreatedAtDesc(Long tenantId, Long woId);
}
