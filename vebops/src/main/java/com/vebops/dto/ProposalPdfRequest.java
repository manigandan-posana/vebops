package com.vebops.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public class ProposalPdfRequest {
    // Seller (Tenant) details for the header
    @NotBlank public String tenantName;
    @NotBlank public String tenantGstin;         // e.g., "33BSZP..."
    @NotBlank public String tenantAddressLine1;
    public String tenantAddressLine2;
    @NotBlank public String tenantStateName;     // e.g., "Tamil Nadu"
    @NotBlank public String tenantStateCode;     // e.g., "33"
    public String tenantEmail;
    public String tenantPhone;

    // These influence tax & header blocks
    @NotBlank public String placeOfSupply;       // e.g., "Maharashtra (27)"
    @NotNull @Positive public BigDecimal taxPercent; // e.g., 18

    // Optional branding / footer
    public String notes;
    public String terms;
    public Integer quoteValidityDays;            // e.g., 3
    public String bankName;
    public String bankAccountNo;
    public String bankIfsc;
    public String bankAccountName;
    public String logoUrl; // optional; skipped if unreachable
}
