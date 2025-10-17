package com.vebops.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import com.vebops.domain.WorkOrder;

public interface WorkOrderQueryRepository extends JpaRepository<WorkOrder, Long> {
    List<WorkOrder> findByTenantIdAndAssignedFE_Id(Long tenantId, Long feId);
}
