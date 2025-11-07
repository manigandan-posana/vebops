package com.vebops.service.impl;

import java.math.BigDecimal;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vebops.domain.enums.InvoiceStatus;
import com.vebops.domain.enums.ProposalStatus;
import com.vebops.domain.enums.WOStatus;
import com.vebops.dto.DashboardSummary;
import com.vebops.repository.InvoiceRepository;
import com.vebops.repository.ProposalRepository;
import com.vebops.repository.WorkOrderRepository;
import com.vebops.service.DashboardService;

/**
 * Implementation of {@link DashboardService} that aggregates counts and revenue
 * using Spring Data repository methods. This service is transactional read-only
 * as it does not modify any state.
 */
@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private final ProposalRepository proposals;
    private final WorkOrderRepository workOrders;
    private final InvoiceRepository invoices;

    public DashboardServiceImpl(ProposalRepository proposals, WorkOrderRepository workOrders, InvoiceRepository invoices) {
        this.proposals = proposals;
        this.workOrders = workOrders;
        this.invoices = invoices;
    }

    @Override
    public DashboardSummary getAdminSummary() {
        DashboardSummary summary = new DashboardSummary();
        // proposals
        summary.draftProposals = proposals.countByStatus(ProposalStatus.DRAFT);
        summary.sentProposals = proposals.countByStatus(ProposalStatus.SENT);
        summary.approvedProposals = proposals.countByStatus(ProposalStatus.APPROVED);
        summary.rejectedProposals = proposals.countByStatus(ProposalStatus.REJECTED);
        // work orders
        summary.newWorkOrders = workOrders.countByStatus(WOStatus.NEW);
        summary.assignedWorkOrders = workOrders.countByStatus(WOStatus.ASSIGNED);
        summary.inProgressWorkOrders = workOrders.countByStatus(WOStatus.IN_PROGRESS);
        summary.completedWorkOrders = workOrders.countByStatus(WOStatus.COMPLETED);
        // invoices
        summary.draftInvoices = invoices.countByStatus(InvoiceStatus.DRAFT);
        summary.sentInvoices = invoices.countByStatus(InvoiceStatus.SENT);
        summary.paidInvoices = invoices.countByStatus(InvoiceStatus.PAID);
        // revenue
        BigDecimal revenue = invoices.sumTotalByStatus(InvoiceStatus.PAID);
        summary.totalRevenue = revenue != null ? revenue : BigDecimal.ZERO;
        return summary;
    }

    @Override
    public DashboardSummary getTenantSummary(Long tenantId) {
        DashboardSummary summary = new DashboardSummary();
        // proposals
        summary.draftProposals = proposals.countByTenantIdAndStatus(tenantId, ProposalStatus.DRAFT);
        summary.sentProposals = proposals.countByTenantIdAndStatus(tenantId, ProposalStatus.SENT);
        summary.approvedProposals = proposals.countByTenantIdAndStatus(tenantId, ProposalStatus.APPROVED);
        summary.rejectedProposals = proposals.countByTenantIdAndStatus(tenantId, ProposalStatus.REJECTED);
        // work orders
        summary.newWorkOrders = workOrders.countByTenantIdAndStatus(tenantId, WOStatus.NEW);
        summary.assignedWorkOrders = workOrders.countByTenantIdAndStatus(tenantId, WOStatus.ASSIGNED);
        summary.inProgressWorkOrders = workOrders.countByTenantIdAndStatus(tenantId, WOStatus.IN_PROGRESS);
        summary.completedWorkOrders = workOrders.countByTenantIdAndStatus(tenantId, WOStatus.COMPLETED);
        // invoices
        summary.draftInvoices = invoices.countByTenantIdAndStatus(tenantId, InvoiceStatus.DRAFT);
        summary.sentInvoices = invoices.countByTenantIdAndStatus(tenantId, InvoiceStatus.SENT);
        summary.paidInvoices = invoices.countByTenantIdAndStatus(tenantId, InvoiceStatus.PAID);
        // revenue
        BigDecimal revenue = invoices.sumTotalByTenantAndStatus(tenantId, InvoiceStatus.PAID);
        summary.totalRevenue = revenue != null ? revenue : BigDecimal.ZERO;
        return summary;
    }
}