package com.vebops.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.function.Predicate;

import com.vebops.service.PortalAccountManager;
import com.vebops.service.ServiceRequestService;
import com.vebops.service.TenantGuard;
import com.vebops.repository.*;
import com.vebops.domain.*;
import com.vebops.domain.enums.*;
import com.vebops.exception.*;
import com.vebops.util.CodeGenerators;

@Service
public class ServiceRequestServiceImpl implements ServiceRequestService {

    private final TenantGuard tenantGuard;
    private final ProposalRepository proposalRepo;
    private final ServiceRequestRepository srRepo;
    private final CustomerRepository customerRepo;
    private final PortalAccountManager portalAccountManager;

    public ServiceRequestServiceImpl(TenantGuard tenantGuard, ProposalRepository proposalRepo, ServiceRequestRepository srRepo,PortalAccountManager portalAccountManager,
                                     CustomerRepository customerRepo) {
        this.tenantGuard = tenantGuard;
        this.proposalRepo = proposalRepo;
        this.srRepo = srRepo;
        this.portalAccountManager = portalAccountManager;
        this.customerRepo = customerRepo;
    }

    @Override
    @Transactional
    public ServiceRequest createFromApprovedProposal(Long tenantId, Long proposalId) {
        tenantGuard.assertActive(tenantId);
        Proposal p = proposalRepo.findById(proposalId).orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (!tenantId.equals(p.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (p.getStatus() != ProposalStatus.APPROVED) {
            throw new BusinessException("Proposal must be APPROVED");
        }
        ServiceRequest sr = new ServiceRequest();
        sr.setTenantId(tenantId);
        sr.setProposal(p);
        sr.setCustomer(p.getCustomer());
        portalAccountManager.ensureForCustomer(tenantId, p.getCustomer(), /*sendCredentials*/ false);
        sr.setServiceType(p.getServiceType());
        // Generate unique SRN (e.g. SRN-YYMM-####)
        Predicate<String> exists = code -> srRepo.findByTenantIdAndSrn(tenantId, code).isPresent();
        sr.setSrn(CodeGenerators.unique("SRN", exists));
        sr.setStatus(SRStatus.NEW);
        srRepo.save(sr);
        return sr;
    }

    @Override
    @Transactional
    public ServiceRequest createWithoutProposal(Long tenantId, Long customerId, ServiceTypeCode serviceType) {
        tenantGuard.assertActive(tenantId);
        var customer = customerRepo.findById(customerId)
            .orElseThrow(() -> new com.vebops.exception.NotFoundException("Customer not found"));
        portalAccountManager.ensureForCustomer(tenantId, customer, /*sendCredentials*/ false);
        ServiceRequest sr = new ServiceRequest();
        sr.setTenantId(tenantId);
        sr.setProposal(null);
        sr.setCustomer(customer);
        sr.setServiceType(serviceType);
        // Generate unique SRN (e.g. SRN-YYMM-####)
        java.util.function.Predicate<String> exists = code -> srRepo.findByTenantIdAndSrn(tenantId, code).isPresent();
        sr.setSrn(com.vebops.util.CodeGenerators.unique("SRN", exists));
        sr.setStatus(com.vebops.domain.enums.SRStatus.NEW);
        srRepo.save(sr);
        return sr;
    }
}
