package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.Proposal;

@Repository
public interface ProposalRepository extends JpaRepository<Proposal, Long> {
    List<Proposal> findByTenantIdAndStatus(Long tenantId, ProposalStatus status);
    List<Proposal> findByTenantIdAndCustomer_Id(Long tenantId, Long customerId);
    Optional<Proposal> findByTenantIdAndId(Long tenantId, Long id);
    List<Proposal> findByTenantId(Long tenantId);
    long countByStatus(ProposalStatus status);
    long countByTenantIdAndStatus(Long tenantId, ProposalStatus status);
}
