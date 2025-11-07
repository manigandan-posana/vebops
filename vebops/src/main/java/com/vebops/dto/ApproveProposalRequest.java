package com.vebops.dto;

import jakarta.validation.constraints.*;

public class ApproveProposalRequest {
    public Long approvedByUserId;        // optional
    @NotBlank public String poNumber;    // PO is required per spec
    public String poUrl;                 // optional proof
}
