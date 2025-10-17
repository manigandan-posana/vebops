package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.ProposalItem;

@Repository
public interface ProposalItemRepository extends JpaRepository<ProposalItem, Long> {
    List<ProposalItem> findByTenantIdAndProposal_Id(Long tenantId, Long proposalId);
}
