package com.vebops.repository;

import java.util.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

import com.vebops.domain.Proposal;
import com.vebops.domain.enums.*;

@Repository
public interface ProposalRepository extends JpaRepository<Proposal, Long> {
    List<Proposal> findByTenantIdAndStatus(Long tenantId, ProposalStatus status);
    List<Proposal> findByTenantIdAndCustomer_Id(Long tenantId, Long customerId);
    Optional<Proposal> findByTenantIdAndId(Long tenantId, Long id);
    List<Proposal> findByTenantId(Long tenantId);
    Page<Proposal> findByTenantId(Long tenantId, Pageable pageable);
    Page<Proposal> findByTenantIdAndStatus(Long tenantId, ProposalStatus status, Pageable pageable);
    Page<Proposal> findByTenantIdAndCustomer_Id(Long tenantId, Long customerId, Pageable pageable);
    Optional<Proposal> findTopByTenantIdAndCustomer_IdOrderByCreatedAtDesc(Long tenantId, Long customerId);
    long countByStatus(ProposalStatus status);
    long countByTenantIdAndStatus(Long tenantId, ProposalStatus status);
}
