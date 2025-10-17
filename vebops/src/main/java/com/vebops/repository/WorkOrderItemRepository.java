package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.WorkOrderItem;

@Repository
public interface WorkOrderItemRepository extends JpaRepository<WorkOrderItem, Long> {
    List<WorkOrderItem> findByTenantIdAndWorkOrder_Id(Long tenantId, Long woId);
}
