package com.vebops.domain.enums;
public enum InvoiceStatus {
    /**
     * The invoice has been generated but not yet sent to the customer.  No
     * payments should be applied while in this state.
     */
    DRAFT,

    /**
     * The invoice has been delivered to the customer.  The due date is
     * calculated based on the tenant’s payment terms.  Reminders may be
     * scheduled from this point.
     */
    SENT,

    /**
     * A portion of the invoice amount has been received.  The outstanding
     * balance remains due until fully paid.  Partial payments should
     * decrease the balance and record the payment transaction details.
     */
    PARTIALLY_PAID,

    /**
     * The invoice has been paid in full.  Collections are complete and
     * further dunning messages should cease.
     */
    PAID,

    /**
     * The invoice is past its due date and remains unpaid.  The system
     * should trigger dunning sequences and update dashboards to highlight
     * overdue amounts.
     */
    OVERDUE,

    /**
     * The invoice has been voided and should not be considered for
     * collection or reporting.  Voiding an invoice requires administrative
     * privileges and may be used to correct mistakes.
     */
    VOID
}
