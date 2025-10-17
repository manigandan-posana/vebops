package com.vebops.domain.enums;
public enum ProposalStatus {
    /**
     * A newly created proposal that has not yet been presented to the
     * customer.  Back office users may edit scope, pricing and terms while
     * in this state.
     */
    DRAFT,

    /**
     * The proposal has been sent to the customer and is awaiting a decision.
     * Follow‑up reminders should be scheduled until the proposal is either
     * approved or rejected, or until it expires.
     */
    SENT,

    /**
     * The customer has formally accepted the proposal.  A purchase order
     * upload is typically expected immediately after approval.  Approval
     * triggers creation of the service request and work allocation.
     */
    APPROVED,

    /**
     * The customer has declined the proposal.  Back office may choose to
     * revise and resend, or close the service request.
     */
    REJECTED,

    /**
     * The proposal has reached its validity end date without a response.
     * Expired proposals should no longer be actionable unless explicitly
     * reissued.  Expiry should be automatic based on terms.
     */
    EXPIRED
}
