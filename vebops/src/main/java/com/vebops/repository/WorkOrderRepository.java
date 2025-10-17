package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.WorkOrder;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {
    Optional<WorkOrder> findByTenantIdAndWan(Long tenantId, String wan);
    List<WorkOrder> findByTenantIdAndStatus(Long tenantId, WOStatus status);
    List<WorkOrder> findByTenantIdAndServiceRequest_Id(Long tenantId, Long srId);
    List<WorkOrder> findByTenantId(Long tenantId);
    long countByStatus(WOStatus status);
    long countByTenantIdAndStatus(Long tenantId, WOStatus status);
}
