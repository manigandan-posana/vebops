package com.vebops.service;

import com.vebops.domain.Invoice;

public interface InvoiceService {
    Invoice generateForWorkOrder(Long tenantId, Long woId);
    void sendInvoice(Long tenantId, Long invoiceId, String toEmail);
    void markPaid(Long tenantId, Long invoiceId);
}
