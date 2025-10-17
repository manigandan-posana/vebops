package com.vebops.dto;
import java.util.Map;
public class ProposalShareRequest {
    public Long proposalId;
    public String toEmail;
    public String templateCode; // e.g., PROPOSAL_DRAFT
    public Map<String, Object> vars;
    public boolean viaAi = true;
}
