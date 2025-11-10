package com.vebops.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.vebops.domain.WorkOrder;

public interface WorkOrderQueryRepository extends JpaRepository<WorkOrder, Long> {
    List<WorkOrder> findByTenantIdAndAssignedFE_Id(Long tenantId, Long feId);
    Page<WorkOrder> findByTenantIdAndAssignedFE_Id(Long tenantId, Long feId, Pageable pageable);
}
