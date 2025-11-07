package com.vebops.service;

import com.vebops.domain.Invoice;

public interface InvoiceService {
    Invoice generateForWorkOrder(Long tenantId, Long woId);
    void sendInvoice(Long tenantId, Long invoiceId, String toEmail);
    /**
     * Send the given invoice via WhatsApp. The implementation is free to
     * integrate with a messaging provider such as Twilio. See
     * InvoiceServiceImpl for a simple stub implementation which logs the
     * delivery request. When this method is called the invoice status is
     * updated to SENT.
     */
    void sendInvoiceViaWhatsapp(Long tenantId, Long invoiceId, String toWhatsapp);
    void markPaid(Long tenantId, Long invoiceId);
}
