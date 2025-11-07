package com.vebops.service;

import org.springframework.stereotype.Service;

@Service
public class TimelineService {
    public void logProposalEvent(Long tenantId, Long proposalId, String code, String message){
        // TODO: persist in your activity/audit table; for now, just log
        System.out.printf("[T% d] Proposal %d :: %s :: %s%n", tenantId, proposalId, code, message);
    }
}
