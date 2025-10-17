package com.vebops.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import com.vebops.service.ProposalService;
import com.vebops.service.TenantGuard;
import com.vebops.service.ServiceRequestService;
import com.vebops.service.WorkOrderService;
import com.vebops.service.EmailService;
import com.vebops.dto.ProposalShareRequest;

import com.vebops.repository.*;
import com.vebops.domain.*;
import com.vebops.domain.enums.*;
import com.vebops.exception.*;

@Service
public class ProposalServiceImpl implements ProposalService {

    private final TenantGuard tenantGuard;
    private final ProposalRepository proposalRepo;
    private final ProposalItemRepository proposalItemRepo;
    private final CustomerRepository customerRepo;
    private final KitRepository kitRepo;
    private final KitItemRepository kitItemRepo;
    private final CustomerPORepository poRepo;
    private final ServiceRequestService srService;
    private final WorkOrderService woService;
    private final EmailService emailService;

    public ProposalServiceImpl(
        TenantGuard tenantGuard,
        ProposalRepository proposalRepo,
        ProposalItemRepository proposalItemRepo,
        CustomerRepository customerRepo,
        KitRepository kitRepo,
        KitItemRepository kitItemRepo,
        CustomerPORepository poRepo,
        ServiceRequestService srService,
        WorkOrderService woService,
        EmailService emailService
    ) {
        this.tenantGuard = tenantGuard;
        this.proposalRepo = proposalRepo;
        this.proposalItemRepo = proposalItemRepo;
        this.customerRepo = customerRepo;
        this.kitRepo = kitRepo;
        this.kitItemRepo = kitItemRepo;
        this.poRepo = poRepo;
        this.srService = srService;
        this.woService = woService;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public Proposal createDraftFromKit(Long tenantId, Long customerId, ServiceTypeCode serviceType, Long kitId, String terms) {
        tenantGuard.assertActive(tenantId);
        Customer customer = customerRepo.findById(customerId).orElseThrow(() -> new NotFoundException("Customer not found"));
        Proposal p = new Proposal();
        p.setTenantId(tenantId);
        p.setCustomer(customer);
        p.setServiceType(serviceType);
        p.setStatus(ProposalStatus.DRAFT);
        p.setTerms(terms);
        if (kitId != null) {
            Kit kit = kitRepo.findById(kitId).orElseThrow(() -> new NotFoundException("Kit not found"));
            p.setKit(kit);
        }
        proposalRepo.save(p);

        BigDecimal subtotal = BigDecimal.ZERO;
        if (p.getKit() != null) {
            List<KitItem> items = kitItemRepo.findByTenantIdAndKit_Id(tenantId, p.getKit().getId());
            for (KitItem ki : items) {
                ProposalItem line = new ProposalItem();
                line.setTenantId(tenantId);
                line.setProposal(p);
                line.setItem(ki.getItem());
                line.setDescription(ki.getItem().getName());
                line.setQty(ki.getQty());
                line.setRate(ki.getItem().getRate());
                line.setAmount(ki.getItem().getRate().multiply(ki.getQty()));
                proposalItemRepo.save(line);
                subtotal = subtotal.add(line.getAmount());
            }
        }
        p.setSubtotal(subtotal);
        p.setTax(BigDecimal.ZERO);
        p.setTotal(subtotal);
        return p;
    }

    @Override
    @Transactional
    public Proposal send(Long tenantId, Long proposalId, ProposalShareRequest share) {
        tenantGuard.assertActive(tenantId);
        Proposal p = proposalRepo.findById(proposalId).orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (!tenantId.equals(p.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (p.getStatus() != ProposalStatus.DRAFT && p.getStatus() != ProposalStatus.REJECTED) {
            throw new BusinessException("Only DRAFT/REJECTED proposals can be sent");
        }
        p.setStatus(ProposalStatus.SENT);
        // Determine an email template to use if the client did not specify one. A reasonable default
        // can be chosen based on the service type of the proposal. For example, supply-only jobs
        // might use a template like "PROPOSAL_SUPPLY" while supply-and-install jobs use
        // "PROPOSAL_SUPPLY_INSTALL". If no matching default exists the generic code
        // "PROPOSAL_GENERIC" is used.
        String templateCode = share.templateCode;
        if (templateCode == null || templateCode.isBlank()) {
            ServiceTypeCode svc = p.getServiceType();
            switch (svc) {
                case SUPPLY -> templateCode = "PROPOSAL_SUPPLY";
                case SUPPLY_INSTALL -> templateCode = "PROPOSAL_SUPPLY_INSTALL";
                case INSTALL_ONLY -> templateCode = "PROPOSAL_INSTALL_ONLY";
                case ERECTION -> templateCode = "PROPOSAL_ERECTION";
                default -> templateCode = "PROPOSAL_GENERIC";
            }
        }
        // Render and send the proposal email using the selected template. The body may optionally
        // be expanded by an AI writer if share.viaAi is true. The entityType parameter is
        // "PROPOSAL" to record the log for proposals.
        String body = emailService.renderTemplate(tenantId, templateCode, share.vars, share.viaAi);
        emailService.send(tenantId, share.toEmail, "Proposal " + p.getId(), body, "PROPOSAL", p.getId(), share.viaAi);
        return p;
    }

    @Override
    @Transactional
    public Proposal approve(Long tenantId, Long proposalId, Long approvedByUserId, String poNumber, String poUrl) {
        tenantGuard.assertActive(tenantId);
        Proposal p = proposalRepo.findById(proposalId).orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (!tenantId.equals(p.getTenantId())) throw new BusinessException("Cross-tenant access");
        p.setStatus(ProposalStatus.APPROVED);
        p.setApprovedAt(Instant.now());
        // minimal approvedBy wiring
        // (approvedBy user entity could be fetched if needed)

        if (poNumber != null && !poNumber.isBlank()) {
            CustomerPO po = new CustomerPO();
            po.setTenantId(tenantId);
            po.setProposal(p);
            po.setPoNumber(poNumber);
            po.setFileUrl(poUrl);
            poRepo.save(po);
        }

        // Now create SR and WO
        var sr = srService.createFromApprovedProposal(tenantId, p.getId());
        var wo = woService.createForServiceRequest(tenantId, sr.getId());
        woService.autoAssignIfInstallation(tenantId, wo.getId());

        return p;
    }

    @Override
    @Transactional
    public void reject(Long tenantId, Long proposalId) {
        tenantGuard.assertActive(tenantId);
        Proposal p = proposalRepo.findById(proposalId).orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (!tenantId.equals(p.getTenantId())) throw new BusinessException("Cross-tenant access");
        p.setStatus(ProposalStatus.REJECTED);
    }
}
