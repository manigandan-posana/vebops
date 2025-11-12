package com.vebops.repository;

import java.util.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

import com.vebops.domain.WorkOrder;
import com.vebops.domain.enums.*;

@Repository
public interface WorkOrderRepository extends JpaRepository<WorkOrder, Long> {
    Optional<WorkOrder> findByTenantIdAndWan(Long tenantId, String wan);
    List<WorkOrder> findByTenantIdAndStatus(Long tenantId, WOStatus status);
    List<WorkOrder> findByTenantIdAndServiceRequest_Id(Long tenantId, Long srId);
    List<WorkOrder> findByTenantIdAndServiceRequest_Customer_IdOrderByCreatedAtDesc(Long tenantId, Long customerId);
    List<WorkOrder> findByTenantId(Long tenantId);
    Page<WorkOrder> findByTenantId(Long tenantId, Pageable pageable);
    Page<WorkOrder> findByTenantIdAndStatus(Long tenantId, WOStatus status, Pageable pageable);
    Page<WorkOrder> findByTenantIdAndServiceRequest_Id(Long tenantId, Long srId, Pageable pageable);
    long countByStatus(WOStatus status);
    long countByTenantIdAndStatus(Long tenantId, WOStatus status);
}
