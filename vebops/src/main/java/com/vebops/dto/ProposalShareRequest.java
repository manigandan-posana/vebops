package com.vebops.dto;
import java.util.Map;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
public class ProposalShareRequest {
    public Long proposalId;
    @Email @NotBlank
    public String toEmail;
    public String templateCode; // e.g., PROPOSAL_DRAFT
    public Map<String, Object> vars;
    public boolean viaAi = true;
}
