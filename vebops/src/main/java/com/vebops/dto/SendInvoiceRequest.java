package com.vebops.dto;

import jakarta.validation.constraints.*;

public class SendInvoiceRequest {
    @Email @NotBlank public String toEmail;
    public boolean viaAi = false;
}
