package com.vebops.service;


import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.*;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.vebops.context.TenantContext;
import com.vebops.domain.BaseTenantEntity;
import com.vebops.domain.Customer;
import com.vebops.domain.CustomerPO;
import com.vebops.domain.Document;
import com.vebops.domain.FieldEngineer;
import com.vebops.domain.Invoice;
import com.vebops.domain.Item;
import com.vebops.domain.ItemStock;
import com.vebops.domain.Kit;
import com.vebops.domain.KitItem;
import com.vebops.domain.Proposal;
import com.vebops.domain.ProposalItem;
import com.vebops.domain.ServiceRequest;
import com.vebops.domain.StockLedger;
import com.vebops.domain.Store;
import com.vebops.domain.User;
import com.vebops.domain.UserRole;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderAssignment;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.domain.enums.FEStatus;
import com.vebops.domain.enums.ProposalStatus;
import com.vebops.domain.enums.RoleCode;
import com.vebops.domain.enums.SRStatus;
import com.vebops.domain.enums.ServiceTypeCode;
import com.vebops.domain.enums.WOStatus;
import com.vebops.dto.*;
import com.vebops.dto.admin.AdminActivityItem;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.CustomerPORepository;
import com.vebops.repository.CustomerRepository;
import com.vebops.repository.DocumentRepository;
import com.vebops.repository.FieldEngineerRepository;
import com.vebops.repository.InvoiceRepository;
import com.vebops.repository.ItemRepository;
import com.vebops.repository.ItemStockRepository;
import com.vebops.repository.KitItemRepository;
import com.vebops.repository.KitRepository;
import com.vebops.repository.PasswordResetTokenRepository;
import com.vebops.repository.ProposalItemRepository;
import com.vebops.repository.ProposalRepository;
import com.vebops.repository.ServiceRequestRepository;
import com.vebops.repository.StockLedgerRepository;
import com.vebops.repository.StoreRepository;
import com.vebops.repository.TenantRepository;
import com.vebops.repository.UserRepository;
import com.vebops.repository.UserRoleRepository;
import com.vebops.repository.WorkOrderAssignmentRepository;
import com.vebops.repository.WorkOrderProgressRepository;
import com.vebops.repository.WorkOrderQueryRepository;
import com.vebops.repository.WorkOrderRepository;

/**
 * Service encapsulating all back office operations originally defined in
 * {@link com.vebops.web.BackOfficeController}. Business logic has been
 * migrated here to centralise transactional boundaries and remove
 * persistence concerns from controllers. Methods generally mirror the
 * corresponding controller endpoints and return ResponseEntity objects
 * directly for convenience.
 */
@Service
public class BackOfficeService {

    private final IntakeService intake;
    private final ProposalService proposals;
    private final WorkOrderService workOrders;
    private final InvoiceService invoices;
    private final ServiceRequestService serviceRequests;
    private final CustomerRepository customers;
    private final UserRepository users;
    private final FieldEngineerRepository feRepo;
    private final UserRoleRepository userRoleRepo;
    private final PasswordEncoder encoder;
    private final StoreRepository storeRepo;
    private final ItemStockRepository itemStockRepo;
    private final StockLedgerRepository stockLedgerRepo;
    private final EmailService emailService;
    private final ItemRepository itemRepo;
    private final KitRepository kitRepo;
    private final KitItemRepository kitItemRepo;
    private final ProposalRepository proposalRepo;
    private final WorkOrderRepository workOrderRepo;
    private final TenantRepository tenantRepo;
    private final InvoiceRepository invoiceRepo;
    private final ProposalItemRepository proposalItemRepo;
    private final CustomerPORepository customerPORepo;
    private final WorkOrderAssignmentRepository woAssignRepo;
    private final WorkOrderProgressRepository woProgressRepo;
    private final WorkOrderQueryRepository woQueryRepo;
    private final PasswordResetTokenRepository resetTokenRepo;
    private final ServiceRequestRepository srRepo;
    private final PortalAccountManager portalAccountManager;
    private final InventoryService inventoryService;
    private final DocumentRepository docRepo;
    private final FileStorageService fileStorageService;

    public BackOfficeService(IntakeService intake,
                             ProposalService proposals,
                             WorkOrderService workOrders,
                             InvoiceService invoices,
                             ServiceRequestService serviceRequests,
                             CustomerRepository customers,
                             UserRepository users,
                             FieldEngineerRepository feRepo,
                             UserRoleRepository userRoleRepo,
                             PasswordEncoder encoder,
                             StoreRepository storeRepo,
                             ItemStockRepository itemStockRepo,
                             StockLedgerRepository stockLedgerRepo,
                             EmailService emailService,
                             ItemRepository itemRepo,
                             KitRepository kitRepo,
                             KitItemRepository kitItemRepo,
                             TenantRepository tenantRepo,
                             ProposalRepository proposalRepo,
                             WorkOrderRepository workOrderRepo,
                             InvoiceRepository invoiceRepo,
                             ProposalItemRepository proposalItemRepo,
                             CustomerPORepository customerPORepo,
                             WorkOrderAssignmentRepository woAssignRepo,
                             WorkOrderProgressRepository woProgressRepo,
                             WorkOrderQueryRepository woQueryRepo,
                             PasswordResetTokenRepository resetTokenRepo,
                             ServiceRequestRepository srRepo, PortalAccountManager portalAccountManager, InventoryService inventoryService
                             , DocumentRepository docRepo, FileStorageService fileStorageService) {
        this.intake = intake;
        this.proposals = proposals;
        this.workOrders = workOrders;
        this.invoices = invoices;
        this.serviceRequests = serviceRequests;
        this.customers = customers;
        this.users = users;
        this.feRepo = feRepo;
        this.userRoleRepo = userRoleRepo;
        this.encoder = encoder;
        this.storeRepo = storeRepo;
        this.itemStockRepo = itemStockRepo;
        this.stockLedgerRepo = stockLedgerRepo;
        this.emailService = emailService;
        this.itemRepo = itemRepo;
        this.kitRepo = kitRepo;
        this.kitItemRepo = kitItemRepo;
        this.proposalRepo = proposalRepo;
        this.workOrderRepo = workOrderRepo;
        this.tenantRepo = tenantRepo;
        this.invoiceRepo = invoiceRepo;
        this.proposalItemRepo = proposalItemRepo;
        this.customerPORepo = customerPORepo;
        this.woAssignRepo = woAssignRepo;
        this.woProgressRepo = woProgressRepo;
        this.woQueryRepo = woQueryRepo;
        this.resetTokenRepo = resetTokenRepo;
        this.srRepo = srRepo;
        this.portalAccountManager = portalAccountManager;
        this.inventoryService = inventoryService;
        this.docRepo = docRepo;
        this.fileStorageService = fileStorageService;
    }

    private Long tenant() { return TenantContext.getTenantId(); }

    // ----- Intake -----
    public ResponseEntity<Long> intakeCall(String customerName, String email, String mobile, String address, ServiceTypeCode serviceType, String serviceHint) {
        Long intakeId = intake.createFromCall(tenant(), customerName, email, mobile, address, serviceType, serviceHint);
        if (serviceType != ServiceTypeCode.SUPPLY && serviceType != ServiceTypeCode.SUPPLY_INSTALL) {
            Long customerId = null;
            if (email != null && !email.isEmpty()) {
                var existing = customers.findByTenantIdAndEmailIgnoreCase(tenant(), email);
                if (existing.isPresent()) {
                    customerId = existing.get().getId();
                }
            }
            if (customerId == null && mobile != null && !mobile.isEmpty()) {
                var existing = customers.findByTenantIdAndMobile(tenant(), mobile);
                if (existing.isPresent()) {
                    customerId = existing.get().getId();
                }
            }
            Customer c;
            if (customerId == null) {
                c = new Customer();
                c.setTenantId(tenant());
                c.setName(customerName);
                c.setEmail(email);
                c.setMobile(mobile);
                c.setAddress(address);
                customers.save(c);
                customerId = c.getId();
            } else {
                c = customers.findById(customerId).orElseThrow();
            }
            portalAccountManager.ensureForCustomer(tenant(), c, true);
            var sr = serviceRequests.createWithoutProposal(tenant(), customerId, serviceType);
            var wo = workOrders.createForServiceRequest(tenant(), sr.getId());
            if (serviceType == ServiceTypeCode.INSTALL_ONLY || serviceType == ServiceTypeCode.SUPPLY_INSTALL) {
                workOrders.autoAssignIfInstallation(tenant(), wo.getId());
            }
        }
        return ResponseEntity.ok(intakeId);
    }

    // ----- Customers -----
    @Transactional
    public ResponseEntity<CreateCustomerResponse> createCustomer(CreateCustomerRequest req) {
        final Long tid = tenant();
        Customer c = new Customer();
        c.setTenantId(tid);
        c.setName(req.name);
        c.setEmail(req.email);
        c.setMobile(req.mobile);
        c.setAddress(req.address);
        customers.save(c);
        Long portalUserId = null;
        boolean portalCreated = false;

        if (Boolean.TRUE.equals(req.createPortal)) {
            var result = portalAccountManager.ensureForCustomer(tid, c, /*sendCredentials*/ true);
            portalUserId = result.userId();
            portalCreated = result.createdNewUser() || result.addedRole();
        }
        return ResponseEntity.created(URI.create("/office/customers/" + c.getId())).body(new CreateCustomerResponse(c.getId(), portalUserId, portalCreated));
    }

    // ----- Field Engineers -----
    @Transactional
    public ResponseEntity<Long> createFE(CreateFERequest req) {
        String rawPwd = com.vebops.util.Passwords.generate(12);
        User u = new User();
        u.setDisplayName(req.displayName);
        u.setEmail(req.email);
        u.setPasswordHash(encoder.encode(rawPwd));
        u.setActive(true);
        users.save(u);
        FieldEngineer fe = new FieldEngineer();
        fe.setTenantId(tenant());
        fe.setUser(u);
        fe.setStatus(FEStatus.AVAILABLE);
        feRepo.save(fe);
        UserRole ur = new UserRole();
        ur.setUser(u);
        ur.setTenantId(tenant());
        ur.setRoleCode(RoleCode.FE);
        ur.setPrimaryRole(false);
        userRoleRepo.save(ur);
        if (u.getEmail() != null && !u.getEmail().isBlank()) {
            emailService.sendUserCredentials(
                tenant(), u.getId(), u.getEmail(),
                u.getDisplayName(), "Field Engineer",
                u.getEmail(), rawPwd
            );
        }
        return ResponseEntity.ok(fe.getId());
    }

    public ResponseEntity<Page<FieldEngineerDto>> listFieldEngineers(FEStatus status, Pageable pageable) {
        Page<FieldEngineer> page = (status == null)
                ? feRepo.findByTenantId(tenant(), pageable)
                : feRepo.findByTenantIdAndStatus(tenant(), status, pageable);
        Page<FieldEngineerDto> body = page.map(FieldEngineerDto::from);
        return ResponseEntity.ok(body);
    }

    // ----- Service Requests -----
    public ResponseEntity<List<ServiceRequest>> listServiceRequests(SRStatus status, Long customerId, int page, int size, String sort) {
        final Long tid = tenant();
        List<ServiceRequest> base = new ArrayList<>();
        if (status != null) {
            base.addAll(srRepo.findByTenantIdAndStatus(tid, status));
        } else if (customerId != null) {
            base.addAll(srRepo.findByTenantIdAndCustomer_Id(tid, customerId));
        } else {
            base.addAll(srRepo.findByTenantId(tid));
        }
        Comparator<ServiceRequest> cmp = Comparator.comparing(ServiceRequest::getId).reversed();
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            String field = parts[0];
            boolean desc = parts.length > 1 && "desc".equalsIgnoreCase(parts[1]);
            if ("createdAt".equals(field)) cmp = Comparator.comparing(BaseTenantEntity::getCreatedAt);
            else if ("updatedAt".equals(field)) cmp = Comparator.comparing(BaseTenantEntity::getUpdatedAt);
            else cmp = Comparator.comparing(ServiceRequest::getId);
            if (desc) cmp = cmp.reversed();
        }
        List<ServiceRequest> list = base.stream().sorted(cmp)
            .skip((long) page * size)
            .limit(size)
            .collect(Collectors.toList());
        list.forEach(sr -> {
            if (sr.getCustomer() != null) sr.getCustomer().getName();
            if (sr.getProposal() != null) {
                sr.getProposal().getId();
            }
        });
        return ResponseEntity.ok(list);
    }

    public ResponseEntity<ServiceRequest> getServiceRequest(Long id) {
        ServiceRequest sr = srRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("ServiceRequest not found"));
        if (!tenant().equals(sr.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (sr.getCustomer() != null) sr.getCustomer().getName();
        if (sr.getProposal() != null) sr.getProposal().getId();
        return ResponseEntity.ok(sr);
    }

    public ResponseEntity<Long> createWorkOrderFromRequest(Long id) {
        var wo = workOrders.createForServiceRequest(tenant(), id);
        var sr = srRepo.findById(id).orElse(null);
        if (sr != null && (sr.getServiceType() == ServiceTypeCode.SUPPLY_INSTALL || sr.getServiceType() == ServiceTypeCode.INSTALL_ONLY)) {
            workOrders.autoAssignIfInstallation(tenant(), wo.getId());
        }
        return ResponseEntity.ok(wo.getId());
    }

    @Transactional
    public ResponseEntity<Void> updateFieldEngineer(Long id, UpdateFERequest req) {
        FieldEngineer fe = feRepo.findById(id)
            .filter(f -> tenant().equals(f.getTenantId()))
            .orElseThrow(() -> new NotFoundException("Field engineer not found"));
        User user = fe.getUser();
        boolean updated = false;
        if (req.displayName != null && !req.displayName.isBlank()) {
            user.setDisplayName(req.displayName);
            updated = true;
        }
        if (req.email != null && !req.email.isBlank()) {
            user.setEmail(req.email);
            updated = true;
        }
        if (req.status != null) {
            fe.setStatus(req.status);
            updated = true;
        }
        if (updated) {
            users.save(user);
            feRepo.save(fe);
        }
        return ResponseEntity.noContent().build();
    }

    // ----- Proposals -----
    public ResponseEntity<List<Proposal>> listProposals(ProposalStatus status, Long customerId, int page, int size, String sort) {
        Long tid = tenant();
        List<Proposal> base;
        if (status != null) {
            base = proposalRepo.findByTenantIdAndStatus(tid, status);
        } else if (customerId != null) {
            base = proposalRepo.findByTenantIdAndCustomer_Id(tid, customerId);
        } else {
            base = proposalRepo.findByTenantId(tid);
        }
        Comparator<Proposal> cmp = Comparator.comparing(Proposal::getId);
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            String field = parts[0];
            boolean desc = parts.length > 1 && "desc".equalsIgnoreCase(parts[1]);
            if ("createdAt".equals(field)) cmp = Comparator.comparing(BaseTenantEntity::getCreatedAt);
            else if ("updatedAt".equals(field)) cmp = Comparator.comparing(BaseTenantEntity::getUpdatedAt);
            else cmp = Comparator.comparing(Proposal::getId);
            if (desc) cmp = cmp.reversed();
        }
        List<Proposal> list = base.stream().sorted(cmp)
                .skip((long) page * size).limit(size).collect(Collectors.toList());
        list.forEach(p -> {
            if (p.getCustomer() != null) {
                p.getCustomer().getName();
            }
            if (p.getKit() != null) {
                p.getKit().getName();
            }
            if (p.getApprovedBy() != null) {
                p.getApprovedBy().getDisplayName();
            }
        });
        return ResponseEntity.ok(list);
    }

    public ResponseEntity<Map<String, Object>> getProposal(Long id) {
        Long tid = tenant();
        Proposal p = proposalRepo.findByTenantIdAndId(tid, id)
                .orElseThrow(() -> new NotFoundException("Proposal not found"));
        List<ProposalItem> items = proposalItemRepo.findByTenantIdAndProposal_Id(tid, id);
        if (p.getCustomer() != null) {
            p.getCustomer().getName();
        }
        if (p.getKit() != null) {
            p.getKit().getName();
        }
        if (p.getApprovedBy() != null) {
            p.getApprovedBy().getDisplayName();
        }
        items.forEach(it -> {
            if (it.getItem() != null) {
                it.getItem().getName();
            }
        });
        Map<String, Object> out = new HashMap<>();
        out.put("proposal", p);
        out.put("items", items);
        List<CustomerPO> pos = customerPORepo.findByTenantIdAndProposal_Id(tid, id);
        out.put("customerPOs", pos);
        return ResponseEntity.ok(out);
    }

    public ResponseEntity<Void> uploadProposalPO(Long id, UploadPORequest body) {
        Long tid = tenant();
        Proposal p = proposalRepo.findByTenantIdAndId(tid, id)
                .orElseThrow(() -> new NotFoundException("Proposal not found"));
        CustomerPO po = new CustomerPO();
        po.setTenantId(tid);
        po.setProposal(p);
        po.setPoNumber(body.poNumber);
        po.setFileUrl(body.fileUrl);
        po.setUploadedAt(Instant.now());
        customerPORepo.save(po);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Map<String, Long>> proposalsSummary() {
        Long tid = tenant();
        Map<String, Long> m = new HashMap<>();
        for (ProposalStatus s : ProposalStatus.values()) {
            m.put(s.name(), proposalRepo.countByTenantIdAndStatus(tid, s));
        }
        return ResponseEntity.ok(m);
    }

    @Transactional
    public ResponseEntity<Proposal> draftProposal(DraftFromKitRequest req) {
        Long tid = tenant();
        Long cid = req.customerId;
        // If no customerId is supplied attempt to create a new customer from provided details.
        if (cid == null) {
            // Require at least a name to create a customer; email/mobile/address may be null.
            if (req.customerName == null || req.customerName.isBlank()) {
                throw new com.vebops.exception.BusinessException("customerName is required when customerId is not provided");
            }
            Customer c = new Customer();
            c.setTenantId(tid);
            c.setName(req.customerName);
            if (req.email != null && !req.email.isBlank()) c.setEmail(req.email);
            if (req.mobile != null && !req.mobile.isBlank()) c.setMobile(req.mobile);
            if (req.address != null && !req.address.isBlank()) c.setAddress(req.address);
            customers.save(c);
            cid = c.getId();
        }
        var p = proposals.createDraftFromKit(tid, cid, req.serviceType, req.kitId, req.terms);
        // prime lazy references for JSON serialization
        if (p.getCustomer() != null) {
            p.getCustomer().getName();
        }
        if (p.getKit() != null) {
            p.getKit().getName();
        }
        if (p.getApprovedBy() != null) {
            p.getApprovedBy().getDisplayName();
        }
        return ResponseEntity.ok(p);
    }

    public ResponseEntity<Proposal> sendProposal(Long id, ProposalShareRequest share) {
        var p = proposals.send(tenant(), id, share);
        if (p.getCustomer() != null) {
            p.getCustomer().getName();
        }
        if (p.getKit() != null) {
            p.getKit().getName();
        }
        if (p.getApprovedBy() != null) {
            p.getApprovedBy().getDisplayName();
        }
        return ResponseEntity.ok(p);
    }

    public ResponseEntity<Proposal> approveProposal(Long id, ApproveProposalRequest body) {
        var p = proposals.approve(tenant(), id, body.approvedByUserId, body.poNumber, body.poUrl);
        if (p.getCustomer() != null) {
            p.getCustomer().getName();
        }
        if (p.getKit() != null) {
            p.getKit().getName();
        }
        if (p.getApprovedBy() != null) {
            p.getApprovedBy().getDisplayName();
        }
        return ResponseEntity.ok(p);
    }

    public ResponseEntity<Void> rejectProposal(Long id) {
        proposals.reject(tenant(), id);
        return ResponseEntity.noContent().build();
    }

    // ----- Work Orders -----
    public ResponseEntity<List<WorkOrder>> listWOs(WOStatus status, Long feId, Long srId, int page, int size, String sort) {
        Long tid = tenant();
        List<WorkOrder> base;
        if (feId != null) {
            base = woQueryRepo.findByTenantIdAndAssignedFE_Id(tid, feId);
        } else if (status != null) {
            base = workOrderRepo.findByTenantIdAndStatus(tid, status);
        } else if (srId != null) {
            base = workOrderRepo.findByTenantIdAndServiceRequest_Id(tid, srId);
        } else {
            base = workOrderRepo.findByTenantId(tid);
        }
        Comparator<WorkOrder> cmp = Comparator.comparing(WorkOrder::getId);
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            String field = parts[0];
            boolean desc = parts.length > 1 && "desc".equalsIgnoreCase(parts[1]);
            if ("createdAt".equals(field)) cmp = Comparator.comparing(BaseTenantEntity::getCreatedAt);
            else if ("updatedAt".equals(field)) cmp = Comparator.comparing(BaseTenantEntity::getUpdatedAt);
            else cmp = Comparator.comparing(WorkOrder::getId);
            if (desc) cmp = cmp.reversed();
        }
        List<WorkOrder> list = base.stream().sorted(cmp)
                .skip((long) page * size).limit(size).collect(Collectors.toList());
        list.forEach(wo -> {
            if (wo.getServiceRequest() != null) {
                wo.getServiceRequest().getId();
                if (wo.getServiceRequest().getCustomer() != null) {
                    wo.getServiceRequest().getCustomer().getName();
                }
            }
            if (wo.getAssignedFE() != null) {
                wo.getAssignedFE().getId();
                if (wo.getAssignedFE().getUser() != null) {
                    wo.getAssignedFE().getUser().getDisplayName();
                }
            }
            if (wo.getAssignedTeam() != null) {
                wo.getAssignedTeam().getId();
                wo.getAssignedTeam().getName();
            }
            if (wo.getCustomerPO() != null) {
                wo.getCustomerPO().getId();
            }
        });
        return ResponseEntity.ok(list);
    }

    public ResponseEntity<WorkOrder> getWO(Long id) {
        WorkOrder wo = workOrderRepo.findById(id).orElseThrow(() -> new NotFoundException("WO not found"));
        if (!tenant().equals(wo.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (wo.getServiceRequest() != null) {
            wo.getServiceRequest().getId();
            if (wo.getServiceRequest().getCustomer() != null) {
                wo.getServiceRequest().getCustomer().getName();
            }
        }
        if (wo.getAssignedFE() != null) {
            wo.getAssignedFE().getId();
            if (wo.getAssignedFE().getUser() != null) {
                wo.getAssignedFE().getUser().getDisplayName();
            }
        }
        if (wo.getAssignedTeam() != null) {
            wo.getAssignedTeam().getId();
            wo.getAssignedTeam().getName();
        }
        if (wo.getCustomerPO() != null) {
            wo.getCustomerPO().getId();
        }
        return ResponseEntity.ok(wo);
    }

    public ResponseEntity<Map<String, Object>> woTimeline(Long id) {
        Long tid = tenant();
        WorkOrder wo = workOrderRepo.findById(id).orElseThrow(() -> new NotFoundException("WO not found"));
        if (!tid.equals(wo.getTenantId())) throw new BusinessException("Cross-tenant access");
        List<WorkOrderAssignment> assignments =
            woAssignRepo.findByTenantIdAndWorkOrder_IdOrderByAssignedAtDesc(tid, id);
        List<WorkOrderProgress> progress =
            woProgressRepo.findByTenantIdAndWorkOrder_IdOrderByCreatedAtAsc(tid, id);
        if (wo.getServiceRequest() != null) {
            wo.getServiceRequest().getId();
            if (wo.getServiceRequest().getCustomer() != null) {
                wo.getServiceRequest().getCustomer().getName();
            }
        }
        if (wo.getAssignedFE() != null) {
            wo.getAssignedFE().getId();
            if (wo.getAssignedFE().getUser() != null) {
                wo.getAssignedFE().getUser().getDisplayName();
            }
        }
        if (wo.getAssignedTeam() != null) {
            wo.getAssignedTeam().getId();
            wo.getAssignedTeam().getName();
        }
        if (wo.getCustomerPO() != null) {
            wo.getCustomerPO().getId();
        }
        assignments.forEach(asn -> {
            if (asn.getWorkOrder() != null) {
                asn.getWorkOrder().getId();
            }
            if (asn.getFieldEngineer() != null) {
                asn.getFieldEngineer().getId();
                if (asn.getFieldEngineer().getUser() != null) {
                    asn.getFieldEngineer().getUser().getDisplayName();
                }
            }
            if (asn.getTeam() != null) {
                asn.getTeam().getId();
                asn.getTeam().getName();
            }
        });
        progress.forEach(pr -> {
            if (pr.getWorkOrder() != null) {
                pr.getWorkOrder().getId();
            }
            if (pr.getByFE() != null) {
                pr.getByFE().getId();
                if (pr.getByFE().getUser() != null) {
                    pr.getByFE().getUser().getDisplayName();
                }
            }
        });
        Map<String, Object> out = new HashMap<>();
        out.put("workOrder", wo);
        out.put("assignments", assignments);
        out.put("progress", progress);
        return ResponseEntity.ok(out);
    }

    public ResponseEntity<Void> assignFe(Long id, AssignFERequest body) {
        workOrders.assignFe(tenant(), id, body.feId, body.note);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Void> addProgress(Long id, ProgressRequest req) {
        workOrders.addProgress(tenant(), id, req.status, req.byFeId, req.remarks, req.photoUrl);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Map<String, Long>> woSummary() {
        Long tid = tenant();
        Map<String, Long> m = new HashMap<>();
        for (WOStatus s : WOStatus.values()) {
            m.put(s.name(), workOrderRepo.countByTenantIdAndStatus(tid, s));
        }
        return ResponseEntity.ok(m);
    }

    public ResponseEntity<Void> issueItem(Long woId, IssueItemRequest req) {
        workOrders.issueItem(tenant(), woId, req.itemId, req.storeId, req.qty);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Void> complete(Long woId) {
        workOrders.complete(tenant(), woId);
        return ResponseEntity.noContent().build();
    }

    // ----- Invoices -----
    public ResponseEntity<Void> sendInvoice(Long invoiceId, SendInvoiceRequest req) {
        invoices.sendInvoice(tenant(), invoiceId, req.toEmail);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Long> intakeEmail(String rawEmail) {
        Long id = intake.createFromEmail(tenant(), rawEmail);
        return ResponseEntity.ok(id);
    }

    // ----- Inventory browse APIs -----
    public ResponseEntity<List<Store>> listStores() {
        var list = storeRepo.findByTenantId(tenant());
        return ResponseEntity.ok(list);
    }

    public ResponseEntity<List<ItemStock>> listStocks(Long itemId, Long storeId) {
        List<ItemStock> list;
        if (itemId != null && storeId != null) {
            var opt = itemStockRepo.findByTenantIdAndItem_IdAndStore_Id(tenant(), itemId, storeId);
            list = opt.map(List::of).orElseGet(List::of);
        } else if (itemId != null) {
            list = itemStockRepo.findByTenantIdAndItem_Id(tenant(), itemId);
        } else if (storeId != null) {
            list = itemStockRepo.findByTenantIdAndStore_Id(tenant(), storeId);
        } else {
            list = itemStockRepo.findByTenantId(tenant());
        }
        list.forEach(s -> {
            if (s.getItem() != null) s.getItem().getName();
            if (s.getStore() != null) s.getStore().getName();
        });
        return ResponseEntity.ok(list);
    }

    public ResponseEntity<List<StockLedger>> listLedger(Long itemId) {
        var list = stockLedgerRepo.findByTenantIdAndItem_IdOrderByOccurredAtAsc(tenant(), itemId);
        list.forEach(l -> {
            if (l.getItem() != null) l.getItem().getName();
            if (l.getStore() != null) l.getStore().getName();
        });
        return ResponseEntity.ok(list);
    }

    // ---------- Items ----------
    @Transactional
    public ResponseEntity<Long> createItem(CreateItemRequest req) {
        Item i = new Item();
        i.setTenantId(req.tenantId);
        i.setCode(req.code);
        i.setName(req.name);
        i.setUom(req.uom);
        i.setRate(req.rate);
        i.setSpec(req.spec);
        i.setTaxPercent(req.taxPercent);
        i.setHsnSac(req.hsnSac);
        if (req.rateType != null && !req.rateType.isBlank()) {
            i.setRateType(com.vebops.domain.enums.RateType.valueOf(req.rateType.trim().toUpperCase()));
        }
        itemRepo.save(i);
        return ResponseEntity.ok(i.getId());
    }

    // ---------- Stores ----------
    @Transactional
    public ResponseEntity<Long> createStore(CreateStoreRequest req) {
        Store s = new Store();
        s.setTenantId(req.tenantId);
        s.setName(req.name);
        s.setLocation(req.location);
        storeRepo.save(s);
        return ResponseEntity.ok(s.getId());
    }

    // ---------- Kits ----------
    @Transactional
    public ResponseEntity<Long> createKit(CreateKitRequest req) {
        Kit k = new Kit();
        k.setTenantId(req.tenantId);
        k.setName(req.name);
        k.setDescription(req.description);
        k.setServiceType(req.serviceType);
        k.setPrice(req.price);
        kitRepo.save(k);
        return ResponseEntity.ok(k.getId());
    }

    @Transactional
    public ResponseEntity<Long> addKitItem(AddKitItemRequest req) {
        KitItem ki = new KitItem();
        ki.setTenantId(req.tenantId);
        ki.setKit(kitRepo.findById(req.kitId).orElseThrow());
        ki.setItem(itemRepo.findById(req.itemId).orElseThrow());
        ki.setQty(req.qty);
        kitItemRepo.save(ki);
        return ResponseEntity.ok(ki.getId());
    }

    public List<Item> listItems(Long tenantId) { return itemRepo.findByTenantId(tenantId); }

    public List<Kit> listKits(Long tenantId) { return kitRepo.findByTenantId(tenantId); }

    public ResponseEntity<List<AdminActivityItem>> recentActivity(int limit) {
        int pageSize = Math.max(1, Math.min(limit, 50));
        var pageReq = PageRequest.of(0, pageSize, Sort.by(Sort.Direction.DESC, "updatedAt"));
        List<Proposal> proposalsList = proposalRepo.findAll(pageReq).getContent();
        List<WorkOrder> workOrdersList = workOrderRepo.findAll(pageReq).getContent();
        List<Invoice> invoicesList = invoiceRepo.findAll(pageReq).getContent();
        Map<Long, String> tenantNames = new HashMap<>();
        List<AdminActivityItem> items = new ArrayList<>();
        for (Proposal p : proposalsList) {
            AdminActivityItem it = new AdminActivityItem();
            it.entity = "PROPOSAL";
            it.id = p.getId();
            it.tenantId = p.getTenantId();
            it.tenantName = tenantNames.computeIfAbsent(p.getTenantId(),
                id -> tenantRepo.findById(id).map(t -> t.getName()).orElse(null));
            it.status = p.getStatus() != null ? p.getStatus().name() : null;
            it.timestamp = p.getUpdatedAt();
            it.event = "PROPOSAL " + (it.status != null ? it.status : "UPDATED");
            items.add(it);
        }
        for (WorkOrder w : workOrdersList) {
            AdminActivityItem it = new AdminActivityItem();
            it.entity = "WORK_ORDER";
            it.id = w.getId();
            it.tenantId = w.getTenantId();
            it.tenantName = tenantNames.computeIfAbsent(w.getTenantId(),
                id -> tenantRepo.findById(id).map(t -> t.getName()).orElse(null));
            it.status = w.getStatus() != null ? w.getStatus().name() : null;
            it.timestamp = w.getUpdatedAt();
            it.event = "WORK_ORDER " + (it.status != null ? it.status : "UPDATED");
            items.add(it);
        }
        for (Invoice i : invoicesList) {
            AdminActivityItem it = new AdminActivityItem();
            it.entity = "INVOICE";
            it.id = i.getId();
            it.tenantId = i.getTenantId();
            it.tenantName = tenantNames.computeIfAbsent(i.getTenantId(),
                id -> tenantRepo.findById(id).map(t -> t.getName()).orElse(null));
            it.status = i.getStatus() != null ? i.getStatus().name() : null;
            it.timestamp = i.getUpdatedAt();
            it.event = "INVOICE " + (it.status != null ? it.status : "UPDATED");
            items.add(it);
        }
        List<AdminActivityItem> merged = items.stream()
            .sorted(Comparator.comparing((AdminActivityItem a) -> a.timestamp, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
            .limit(limit)
            .collect(Collectors.toList());
        return ResponseEntity.ok(merged);
    }

    public ResponseEntity<Page<CustomerDto>> listCustomers(String name, String email, String mobile, Boolean hasPortal, Pageable pageable) {
        final Long tid = tenant();
        Page<Customer> page;
        if (Boolean.TRUE.equals(hasPortal)) {
            page = customers.findByTenantIdAndPortalUserIsNotNull(tid, pageable);
        } else if (Boolean.FALSE.equals(hasPortal)) {
            page = customers.findByTenantIdAndPortalUserIsNull(tid, pageable);
        } else if (email != null && !email.isBlank()) {
            page = customers.findByTenantIdAndEmailIgnoreCase(tid, email.trim(), pageable);
        } else if (mobile != null && !mobile.isBlank()) {
            page = customers.findByTenantIdAndMobile(tid, mobile.trim(), pageable);
        } else if (name != null && !name.isBlank()) {
            page = customers.findByTenantIdAndNameContainingIgnoreCase(tid, name.trim(), pageable);
        } else {
            page = customers.findByTenantId(tid, pageable);
        }
        return ResponseEntity.ok(page.map(CustomerDto::from));
    }

    @Transactional
    public ResponseEntity<CustomerDto> updateCustomer(Long id, UpdateCustomerRequest body) {
        final Long tid = tenant();
        Customer c = customers.findById(id)
            .orElseThrow(() -> new NotFoundException("Customer not found"));
        if (!tid.equals(c.getTenantId())) {
            throw new NotFoundException("Customer not found");
        }
        if (body.name != null && !body.name.isBlank()) {
            c.setName(body.name.trim());
        }
        if (body.email != null && !body.email.isBlank()) {
            String newEmail = body.email.trim();
            boolean emailTakenByAnotherCustomer =
                customers.findByTenantIdAndEmailIgnoreCase(tid, newEmail)
                         .filter(other -> !other.getId().equals(c.getId()))
                         .isPresent();
            if (emailTakenByAnotherCustomer) {
                throw new BusinessException("Another customer with this email already exists.");
            }
            String oldEmail = c.getEmail();
            boolean changed = oldEmail == null || !oldEmail.equalsIgnoreCase(newEmail);
            c.setEmail(newEmail);
            if (changed && Boolean.TRUE.equals(body.updatePortalEmail) && c.getPortalUser() != null) {
                var u = c.getPortalUser();
                if (!newEmail.equalsIgnoreCase(u.getEmail())) {
                    boolean usedByOtherUser =
                        users.existsByEmail(newEmail) && !newEmail.equalsIgnoreCase(u.getEmail());
                    if (usedByOtherUser) {
                        throw new BusinessException("Email already in use by another user account.");
                    }
                    u.setEmail(newEmail);
                    users.save(u);
                }
            }
        }
        if (body.mobile != null && !body.mobile.isBlank()) {
            c.setMobile(body.mobile.trim());
        }
        if (body.address != null && !body.address.isBlank()) {
            c.setAddress(body.address.trim());
        }
        if (Boolean.TRUE.equals(body.enablePortal)) {
            if (c.getPortalUser() == null) {
                portalAccountManager.ensureForCustomer(tid, c, /*sendCredentials*/ true);
            }
        }
        customers.save(c);
        return ResponseEntity.ok(CustomerDto.from(c));
    }

    @Transactional
    public ResponseEntity<Void> deleteCustomer(Long id, boolean deletePortalUserIfOrphan) {
        final Long tid = tenant();
        Customer c = customers.findById(id).orElseThrow(() -> new NotFoundException("Customer not found"));
        if (!tid.equals(c.getTenantId())) throw new NotFoundException("Customer not found");
        if (srRepo.findByTenantIdAndCustomer_Id(tid, c.getId()).size() > 0) {
            throw new BusinessException("Cannot delete customer with associated service requests");
        }
        Long portalUserId = (c.getPortalUser() != null) ? c.getPortalUser().getId() : null;
        customers.delete(c);
        if (deletePortalUserIfOrphan && portalUserId != null) {
            boolean linkedElsewhere =
                    customers.countByPortalUserId(portalUserId) > 0
                 || feRepo.countByUserId(portalUserId) > 0;
            if (!linkedElsewhere) {
                userRoleRepo.deleteByUser_IdAndTenantId(portalUserId, tid);
                resetTokenRepo.deleteByUser_Id(portalUserId);
                users.findById(portalUserId).ifPresent(users::delete);
            }
        }
        return ResponseEntity.noContent().build();
    }

    @Transactional
    public ResponseEntity<Void> deleteFieldEngineer(Long id, boolean deleteUserIfOrphan) {
        final Long tid = tenant();
        FieldEngineer fe = feRepo.findById(id).orElseThrow(() -> new NotFoundException("Field Engineer not found"));
        if (!tid.equals(fe.getTenantId())) throw new NotFoundException("Field Engineer not found");
        if (!woQueryRepo.findByTenantIdAndAssignedFE_Id(tid, fe.getId()).isEmpty()) {
            throw new BusinessException("Cannot delete field engineer with assigned work orders");
        }
        Long userId = (fe.getUser() != null) ? fe.getUser().getId() : null;
        feRepo.delete(fe);
        if (deleteUserIfOrphan && userId != null) {
            boolean linkedElsewhere =
                    feRepo.countByUserId(userId) > 0
                 || customers.countByPortalUserId(userId) > 0;
            if (!linkedElsewhere) {
                userRoleRepo.deleteByUser_IdAndTenantId(userId, tid);
                resetTokenRepo.deleteByUser_Id(userId);
                users.findById(userId).ifPresent(users::delete);
            }
        }
        return ResponseEntity.noContent().build();
    }

    public Map<String, String> resetPasswordForTenantUser(Long id, boolean sendEmail) {
        final Long tid = tenant();
        boolean belongs =
               feRepo.existsByTenantIdAndUserId(tid, id)
            || customers.existsByTenantIdAndPortalUserId(tid, id);
        if (!belongs) throw new NotFoundException("User not found");
        var user = users.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
        String tempPassword = com.vebops.util.Passwords.generate(12);
        user.setPasswordHash(encoder.encode(tempPassword));
        users.save(user);
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            emailService.sendUserCredentials(
                tid, user.getId(), user.getEmail(),
                user.getDisplayName(), "Back Office",
                user.getEmail(), tempPassword
            );
        }
        return Map.of("tempPassword", tempPassword);
    }

    @Transactional
    public ResponseEntity<Void> receiveStock(ReceiveStockRequest req) {
        inventoryService.receive(tenant(), req.itemId, req.storeId, req.qty, req.refProcId, req.unitCost);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Void> returnItem(Long woId, ReturnItemRequest req) {
        workOrders.returnItem(tenant(), woId, req.itemId, req.storeId, req.qty);
        return ResponseEntity.noContent().build();
    }
    
    public ResponseEntity<List<StockLedger>> listLedger(Long itemId, Long storeId) {
        List<StockLedger> list;
        if (storeId != null) {
            list = stockLedgerRepo.findByTenantIdAndItem_IdAndStore_IdOrderByOccurredAtAsc(tenant(), itemId, storeId);
        } else {
            list = stockLedgerRepo.findByTenantIdAndItem_IdOrderByOccurredAtAsc(tenant(), itemId);
        }
        list.forEach(l -> { if (l.getItem()!=null) l.getItem().getName(); if (l.getStore()!=null) l.getStore().getName(); });
        return ResponseEntity.ok(list);
    }

    // imports: Document, DocumentEntityType, DocumentKind, DocumentRepository
    public ResponseEntity<Document> attachProposalDocument(Long proposalId, UploadDocumentRequest req) {
        Long tid = tenant();
        Proposal p = proposalRepo.findByTenantIdAndId(tid, proposalId)
            .orElseThrow(() -> new NotFoundException("Proposal not found"));
        Document d = new Document();
        d.setTenantId(tid);
        d.setEntityType(DocumentEntityType.PROPOSAL);
        d.setEntityId(p.getId());
        d.setKind(req.kind);
        d.setUrl(req.url);
        d.setFilename(req.filename);
        d.setUploadedAt(java.time.Instant.now());
        docRepo.save(d);
        return ResponseEntity.ok(d);
    }

    public ResponseEntity<List<Document>> listProposalDocuments(Long proposalId) {
        Long tid = tenant();
        Proposal p = proposalRepo.findByTenantIdAndId(tid, proposalId)
            .orElseThrow(() -> new NotFoundException("Proposal not found"));
        var docs = docRepo.findByEntityTypeAndEntityIdAndTenantId(
            com.vebops.domain.enums.DocumentEntityType.PROPOSAL, p.getId(), tid);
        // touch nothing; plain entity is fine for JSON
        return ResponseEntity.ok(docs);
    }

    // 2) Multipart uploader (PROPOSAL PDF)
// 2) Multipart uploader (PROPOSAL PDF)
public ResponseEntity<Document> attachProposalDocumentFile(Long proposalId, MultipartFile file, String type) {
    Long tid = tenant();
    Proposal p = proposalRepo.findByTenantIdAndId(tid, proposalId)
        .orElseThrow(() -> new NotFoundException("Proposal not found"));

    String ct = file.getContentType() != null ? file.getContentType() : "application/pdf";
    if (!ct.toLowerCase().contains("pdf") && !file.getOriginalFilename().toLowerCase().endsWith(".pdf")) {
        throw new BusinessException("Only PDF files are allowed");
    }

    Document d = new Document();
    d.setTenantId(tid);
    d.setEntityType(DocumentEntityType.PROPOSAL);
    d.setEntityId(p.getId());
    d.setKind(DocumentKind.PDF);
    d.setUploadedAt(java.time.Instant.now());
    docRepo.saveAndFlush(d); // need ID for path

    try {
        String savedName = fileStorageService.saveProposalDoc(tid, proposalId, d.getId(), file);
        d.setFilename(savedName);       // <— store the saved name, not the original
    } catch (IOException e) {
        throw new BusinessException("Failed to store file");
    }

    d.setUrl(String.format("/office/proposals/%d/documents/%d/download", proposalId, d.getId()));
    docRepo.save(d);
    return ResponseEntity.ok(d);
}


    
public ResponseEntity<Resource> downloadProposalDocument(Long proposalId, Long docId) {
  Long tid = tenant();
  Document d = docRepo.findById(docId)
      .orElseThrow(() -> new NotFoundException("Document not found"));
  if (!tid.equals(d.getTenantId())) throw new BusinessException("Cross-tenant access");
  if (d.getEntityType() != DocumentEntityType.PROPOSAL || !d.getEntityId().equals(proposalId)) {
    throw new BusinessException("Document does not belong to this proposal");
  }

  Path path = fileStorageService
      .loadProposalDoc(tid, proposalId, docId, d.getFilename())
      .toPath();
  if (!Files.exists(path)) throw new NotFoundException("File not found on disk");

  try {
    long size = Files.size(path);

    // detect true mime (pdf, png, docx, etc.)
    String ct = Files.probeContentType(path);
    if (ct == null || ct.isBlank()) ct = "application/octet-stream";
    MediaType mediaType = MediaType.parseMediaType(ct);

    InputStreamResource body = new InputStreamResource(Files.newInputStream(path, StandardOpenOption.READ));

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(mediaType);
    headers.setContentLength(size);
    headers.setContentDisposition(
        ContentDisposition.attachment()
            .filename(d.getFilename(), StandardCharsets.UTF_8)
            .build()
    );
    headers.add(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "Content-Disposition");
    // stop proxies/CDNs from re-encoding or "optimizing"
    headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate, no-transform");
    headers.add(HttpHeaders.PRAGMA, "no-cache");
    headers.add(HttpHeaders.EXPIRES, "0");

    return new ResponseEntity<>(body, headers, HttpStatus.OK);
  } catch (IOException e) {
    throw new BusinessException("Failed to read file");
  }
}

    // add near other invoice helpers
public ResponseEntity<Invoice> getInvoiceForWorkOrder(Long woId) {
    Long tid = tenant();
    Invoice inv = invoiceRepo.findByTenantIdAndWorkOrder_Id(tid, woId)
        .orElseThrow(() -> new NotFoundException("Invoice not found for this Work Order"));
    // touch a few associations to avoid lazy issues
    if (inv.getCustomer() != null) inv.getCustomer().getId();
    if (inv.getWorkOrder() != null) inv.getWorkOrder().getId();
    return ResponseEntity.ok(inv);
}



}