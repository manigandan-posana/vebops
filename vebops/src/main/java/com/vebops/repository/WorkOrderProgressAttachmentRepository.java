package com.vebops.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.vebops.domain.WorkOrderProgressAttachment;

public interface WorkOrderProgressAttachmentRepository extends JpaRepository<WorkOrderProgressAttachment, Long> {
    List<WorkOrderProgressAttachment> findByTenantIdAndProgress_Id(Long tenantId, Long progressId);
    List<WorkOrderProgressAttachment> findByTenantIdAndProgress_IdIn(Long tenantId, Collection<Long> progressIds);
    Optional<WorkOrderProgressAttachment> findByTenantIdAndId(Long tenantId, Long id);
}
