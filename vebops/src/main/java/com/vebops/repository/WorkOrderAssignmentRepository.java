package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.WorkOrderAssignment;

@Repository
public interface WorkOrderAssignmentRepository extends JpaRepository<WorkOrderAssignment, Long> {
    List<WorkOrderAssignment> findByTenantIdAndWorkOrder_IdOrderByAssignedAtDesc(Long tenantId, Long woId);
}
