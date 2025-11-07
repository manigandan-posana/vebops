package com.vebops.service;

import com.vebops.domain.Proposal;
import com.vebops.dto.ProposalShareRequest;
import com.vebops.domain.enums.ServiceTypeCode;

public interface ProposalService {
    Proposal createDraftFromKit(Long tenantId, Long customerId, ServiceTypeCode serviceType, Long kitId, String terms);
    Proposal send(Long tenantId, Long proposalId, ProposalShareRequest share);
    Proposal approve(Long tenantId, Long proposalId, Long approvedByUserId, String poNumber, String poUrl);
    void reject(Long tenantId, Long proposalId);
}
