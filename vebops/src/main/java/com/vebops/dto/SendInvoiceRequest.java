package com.vebops.dto;

import jakarta.validation.constraints.*;

public class SendInvoiceRequest {
    @Email @NotBlank public String toEmail;
    public boolean viaAi = false;

    // Optional WhatsApp number. When provided the invoice will be delivered via a
    // WhatsApp message instead of email. The backend will determine the
    // appropriate delivery channel based on whether `toWhatsapp` is non‑blank.
    public String toWhatsapp;
}
