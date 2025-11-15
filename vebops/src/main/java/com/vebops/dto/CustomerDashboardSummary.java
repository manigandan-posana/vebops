package com.vebops.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Aggregated view of a customer's proposals, work orders and invoices used by
 * the customer portal overview page.
 */
public record CustomerDashboardSummary(
        long openProposals,
        long awaitingPurchaseOrder,
        long approvedProposals,
        long activeWorkOrders,
        long inProgressWorkOrders,
        long completedWorkOrders,
        long pendingInvoices,
        BigDecimal outstandingAmount,
        Instant lastProgressAt
) {}
