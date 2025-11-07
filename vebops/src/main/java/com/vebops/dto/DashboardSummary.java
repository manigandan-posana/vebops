package com.vebops.dto;

import java.math.BigDecimal;

/**
 * Summary statistics returned by dashboard endpoints. Counts proposals, work
 * orders and invoices grouped by status and aggregates revenue and material
 * usage. This object is returned as JSON.
 */
public class DashboardSummary {
    public long draftProposals;
    public long sentProposals;
    public long approvedProposals;
    public long rejectedProposals;

    public long newWorkOrders;
    public long assignedWorkOrders;
    public long inProgressWorkOrders;
    public long completedWorkOrders;

    public long draftInvoices;
    public long sentInvoices;
    public long paidInvoices;

    public BigDecimal totalRevenue;
}