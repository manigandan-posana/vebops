package com.vebops.service;


import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
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
import com.vebops.domain.PurchaseOrder;
import com.vebops.domain.PurchaseOrderLine;
import com.vebops.domain.ServiceRequest;
import com.vebops.domain.StockLedger;
import com.vebops.domain.Store;
import com.vebops.domain.User;
import com.vebops.domain.UserRole;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderAssignment;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.domain.WorkOrderProgressAttachment;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.domain.enums.EmailEntityType;
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
import com.vebops.repository.EmailTemplateRepository;
import com.vebops.repository.FieldEngineerRepository;
import com.vebops.repository.InvoiceRepository;
import com.vebops.repository.ItemRepository;
import com.vebops.repository.ItemStockRepository;
import com.vebops.repository.KitItemRepository;
import com.vebops.repository.KitRepository;
import com.vebops.repository.PasswordResetTokenRepository;
import com.vebops.repository.ProposalItemRepository;
import com.vebops.repository.ProposalRepository;
import com.vebops.repository.PurchaseOrderLineRepository;
import com.vebops.repository.PurchaseOrderRepository;
import com.vebops.repository.ServiceRequestRepository;
import com.vebops.repository.ServiceRepository;
import com.vebops.repository.StockLedgerRepository;
import com.vebops.repository.StoreRepository;
import com.vebops.repository.TenantRepository;
import com.vebops.repository.UserRepository;
import com.vebops.repository.UserRoleRepository;
import com.vebops.repository.WorkOrderAssignmentRepository;
import com.vebops.repository.WorkOrderProgressRepository;
import com.vebops.repository.WorkOrderProgressAttachmentRepository;
import com.vebops.repository.WorkOrderQueryRepository;
import com.vebops.repository.WorkOrderRepository;
import com.vebops.util.PdfUtil;

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

    private static final EnumSet<WOStatus> ACTIVE_WO_STATUSES = EnumSet.of(
        WOStatus.NEW,
        WOStatus.ASSIGNED,
        WOStatus.IN_PROGRESS,
        WOStatus.ON_HOLD
    );

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
    private final PurchaseOrderRepository purchaseOrderRepo;
    private final PurchaseOrderLineRepository purchaseOrderLineRepo;
    private final WorkOrderAssignmentRepository woAssignRepo;
    private final WorkOrderProgressRepository woProgressRepo;
    private final WorkOrderProgressAttachmentRepository progressAttachmentRepo;
    private final WorkOrderQueryRepository woQueryRepo;
    private final PasswordResetTokenRepository resetTokenRepo;
    private final ServiceRequestRepository srRepo;
    private final ServiceRepository serviceRepo;
    private final PortalAccountManager portalAccountManager;
    private final InventoryService inventoryService;
    private final DocumentRepository docRepo;
    private final FileStorageService fileStorageService;
    private final ProposalDocumentService proposalDocs;
    private final ProposalSharingService proposalShare;
    // Removed unused customerRepo: customers repository is injected separately
    private final TenantGuard tenantGuard;
    private final EmailTemplateRepository emailTemplateRepo;

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
                             PurchaseOrderRepository purchaseOrderRepo,
                             PurchaseOrderLineRepository purchaseOrderLineRepo,
                             WorkOrderAssignmentRepository woAssignRepo,
                             WorkOrderProgressRepository woProgressRepo,
                             WorkOrderProgressAttachmentRepository progressAttachmentRepo,
                             WorkOrderQueryRepository woQueryRepo,
                             PasswordResetTokenRepository resetTokenRepo,
                             ServiceRequestRepository srRepo,
                             ServiceRepository serviceRepo,
                             PortalAccountManager portalAccountManager,
                             InventoryService inventoryService
                             , DocumentRepository docRepo, FileStorageService fileStorageService,
                             ProposalDocumentService proposalDocs, ProposalSharingService proposalShare,
                             /* removed unused customerRepo */ TenantGuard tenantGuard, EmailTemplateRepository emailTemplateRepo) {
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
        this.purchaseOrderRepo = purchaseOrderRepo;
        this.purchaseOrderLineRepo = purchaseOrderLineRepo;
        this.woAssignRepo = woAssignRepo;
        this.woProgressRepo = woProgressRepo;
        this.progressAttachmentRepo = progressAttachmentRepo;
        this.woQueryRepo = woQueryRepo;
        this.resetTokenRepo = resetTokenRepo;
        this.srRepo = srRepo;
        this.serviceRepo = serviceRepo;
        this.portalAccountManager = portalAccountManager;
        this.inventoryService = inventoryService;
        this.docRepo = docRepo;
        this.fileStorageService = fileStorageService;
        this.proposalDocs = proposalDocs;
        this.proposalShare = proposalShare;
        this.tenantGuard = tenantGuard;
        this.emailTemplateRepo = emailTemplateRepo;
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
    final String email  = req.email  == null ? null : req.email.trim().toLowerCase();
    final String mobile = req.mobile == null ? null : req.mobile.trim();

    Optional<Customer> existing = Optional.empty();
    if (email != null && !email.isBlank()) {
        existing = customers.findByTenantIdAndEmailIgnoreCase(tid, email);
    }
    if (existing.isEmpty() && mobile != null && !mobile.isBlank()) {
        existing = customers.findByTenantIdAndMobile(tid, mobile);
    }

    Customer c = existing.orElseGet(() -> {
        Customer nc = new Customer();
        nc.setTenantId(tid);
        nc.setName(req.name);
        nc.setEmail(email);
        nc.setMobile(mobile);
        nc.setAddress(req.address);
        return customers.save(nc);
    });

    Long portalUserId = null;
    boolean portalCreated = false;
    if (Boolean.TRUE.equals(req.createPortal)) {
        var result = portalAccountManager.ensureForCustomer(tid, c, /*sendCredentials*/ true);
        portalUserId   = result.userId();
        portalCreated  = result.createdNewUser() || result.addedRole();
    }

    return ResponseEntity.ok(new CreateCustomerResponse(c.getId(), portalUserId, portalCreated));
}


    // ----- Field Engineers -----
    @Transactional
    public ResponseEntity<Long> createFE(CreateFERequest req) {
        final Long tid = tenant();
        final String email = req.email == null ? null : req.email.trim().toLowerCase();

        if (email == null || email.isBlank()) {
            throw new BusinessException("Email is required");
        }

        // 1) find or create user (dedupe by global unique email)
        User u = users.findByEmail(email).orElse(null);
        boolean createdUser = false;
        String rawPwd = null;
        if (u == null) {
            createdUser = true;
            rawPwd = com.vebops.util.Passwords.generate(12);
            u = new User();
            String display = (req.displayName != null && !req.displayName.isBlank())
                    ? req.displayName.trim()
                    : email;
            u.setDisplayName(display);
            u.setEmail(email);
            u.setPasswordHash(encoder.encode(rawPwd));
            u.setActive(true);
            u = users.save(u);
        } else {
            boolean dirty = false;
            if (req.displayName != null && !req.displayName.isBlank()) {
                String display = req.displayName.trim();
                if (u.getDisplayName() == null || !u.getDisplayName().equals(display)) {
                    u.setDisplayName(display);
                    dirty = true;
                }
            }
            if (dirty) {
                u = users.save(u);
            }
        }

        // 2) if FE already exists for this tenant+user, return it
        var existingFe = feRepo.findFirstByTenantIdAndUser_Id(tid, u.getId());
        if (existingFe.isPresent()) {
            // If an FE already exists we still ensure they have the FE role.
            if (!userRoleRepo.existsByUser_IdAndTenantIdAndRoleCode(u.getId(), tid, RoleCode.FE)) {
                UserRole ur = new UserRole();
                ur.setUser(u);
                ur.setTenantId(tid);
                ur.setRoleCode(RoleCode.FE);
                ur.setPrimaryRole(false);
                userRoleRepo.save(ur);
            }
            if (createdUser && rawPwd != null) {
                emailService.sendUserCredentials(
                        tid,
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName(),
                        "Field Engineer",
                        u.getEmail(),
                        rawPwd);
            }
            return ResponseEntity.ok(existingFe.get().getId());
        }

        // 3) else create FE link (unique by uk_fe_tenant_user -> race safe)
        FieldEngineer fe = new FieldEngineer();
        fe.setTenantId(tid);
        fe.setUser(u);
        fe.setStatus(FEStatus.AVAILABLE);
        feRepo.save(fe);

        // 4) ensure FE role in this tenant
        if (!userRoleRepo.existsByUser_IdAndTenantIdAndRoleCode(u.getId(), tid, RoleCode.FE)) {
            UserRole ur = new UserRole();
            ur.setUser(u);
            ur.setTenantId(tid);
            ur.setRoleCode(RoleCode.FE);
            ur.setPrimaryRole(false);
            userRoleRepo.save(ur);
        }

        // 5) Email credentials for newly created users so the FE can log in immediately.
        if (createdUser && rawPwd != null) {
            emailService.sendUserCredentials(
                    tid,
                    u.getId(),
                    u.getEmail(),
                    u.getDisplayName(),
                    "Field Engineer",
                    u.getEmail(),
                    rawPwd);
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
    public ResponseEntity<Page<ServiceRequest>> listServiceRequests(SRStatus status, Long customerId, int page, int size, String sort) {
        final Long tid = tenant();
        Pageable pageable = buildPageRequest(page, size, sort, "createdAt");
        Page<ServiceRequest> result;
        if (status != null) {
            result = srRepo.findByTenantIdAndStatus(tid, status, pageable);
        } else if (customerId != null) {
            result = srRepo.findByTenantIdAndCustomer_Id(tid, customerId, pageable);
        } else {
            result = srRepo.findByTenantId(tid, pageable);
        }
        result.getContent().forEach(this::hydrateServiceRequest);
        return ResponseEntity.ok(result);
    }

    public ResponseEntity<ServiceRequest> getServiceRequest(Long id) {
        ServiceRequest sr = srRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("ServiceRequest not found"));
        if (!tenant().equals(sr.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (sr.getCustomer() != null) sr.getCustomer().getName();
        if (sr.getProposal() != null) sr.getProposal().getId();
        return ResponseEntity.ok(sr);
    }

    public ResponseEntity<WorkOrder> createWorkOrderFromRequest(Long id) {
        Long tid = tenant();
        // If already exists, respond 409 with the existing WO (lets UI show WAN)
        var existing = workOrderRepo.findByTenantIdAndServiceRequest_Id(tid, id);
        if (existing != null && !existing.isEmpty()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(existing.get(0));
        }
        var wo = workOrders.createForServiceRequest(tid, id);
        var sr = srRepo.findById(id).orElse(null);
        if (sr != null && (sr.getServiceType() == ServiceTypeCode.SUPPLY_INSTALL || sr.getServiceType() == ServiceTypeCode.INSTALL_ONLY)) {
            workOrders.autoAssignIfInstallation(tid, wo.getId());
        }
        return ResponseEntity.created(URI.create("/office/wo/" + wo.getId())).body(wo);
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
    public ResponseEntity<Page<Proposal>> listProposals(ProposalStatus status, Long customerId, int page, int size, String sort) {
        Long tid = tenant();
        Pageable pageable = buildPageRequest(page, size, sort, "id");
        Page<Proposal> result;
        if (status != null) {
            result = proposalRepo.findByTenantIdAndStatus(tid, status, pageable);
        } else if (customerId != null) {
            result = proposalRepo.findByTenantIdAndCustomer_Id(tid, customerId, pageable);
        } else {
            result = proposalRepo.findByTenantId(tid, pageable);
        }
        result.getContent().forEach(this::hydrateProposal);
        return ResponseEntity.ok(result);
    }

    public ResponseEntity<Map<String, Object>> getProposal(Long id) {
        Long tid = tenant();
        Proposal p = proposalRepo.findByTenantIdAndId(tid, id)
                .orElseThrow(() -> new NotFoundException("Proposal not found"));
        hydrateProposal(p);
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
    public ResponseEntity<Page<WorkOrder>> listWOs(WOStatus status, Long feId, Long srId, int page, int size, String sort) {
        Long tid = tenant();
        Pageable pageable = buildPageRequest(page, size, sort, "id");
        Page<WorkOrder> result;
        if (feId != null) {
            result = woQueryRepo.findByTenantIdAndAssignedFE_Id(tid, feId, pageable);
        } else if (status != null) {
            result = workOrderRepo.findByTenantIdAndStatus(tid, status, pageable);
        } else if (srId != null) {
            result = workOrderRepo.findByTenantIdAndServiceRequest_Id(tid, srId, pageable);
        } else {
            result = workOrderRepo.findByTenantId(tid, pageable);
        }
        result.getContent().forEach(this::hydrateWorkOrder);
        return ResponseEntity.ok(result);
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

    private Pageable buildPageRequest(int page, int size, String sort, String defaultProperty) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 200));
        Sort sortSpec = Sort.by(Sort.Direction.DESC, defaultProperty);
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            String property = parts.length > 0 && !parts[0].isBlank() ? parts[0].trim() : defaultProperty;
            Sort.Direction direction = (parts.length > 1 && "asc".equalsIgnoreCase(parts[1]))
                    ? Sort.Direction.ASC : Sort.Direction.DESC;
            sortSpec = Sort.by(direction, property);
        }
        return PageRequest.of(safePage, safeSize, sortSpec);
    }

    private PurchaseOrderDtos.ListItem toPurchaseOrderListItem(PurchaseOrder po) {
        PurchaseOrderDtos.ListItem row = new PurchaseOrderDtos.ListItem();
        row.id = po.getId();
        row.voucherNumber = po.getVoucherNumber();
        row.date = po.getOrderDate();
        row.supplierName = po.getSupplierName();
        row.supplierEmail = po.getSupplierEmail();
        row.supplierWhatsapp = po.getSupplierWhatsapp();
        row.grandTotal = po.getGrandTotal();
        if (po.getService() != null) {
            row.serviceId = po.getService().getId();
            row.serviceWan = row.serviceId != null ? String.valueOf(row.serviceId) : null;
        }
        row.buyerName = po.getBuyerName();
        return row;
    }

    private PurchaseOrderDtos.Detail toPurchaseOrderDetail(PurchaseOrder po, List<PurchaseOrderLine> lines) {
        PurchaseOrderDtos.Detail detail = new PurchaseOrderDtos.Detail();
        detail.header = toPurchaseOrderListItem(po);

        PurchaseOrderDtos.Party buyer = new PurchaseOrderDtos.Party();
        buyer.name = po.getBuyerName();
        buyer.address = po.getBuyerAddress();
        buyer.phone = po.getBuyerPhone();
        buyer.gstin = po.getBuyerGstin();
        buyer.stateName = po.getBuyerStateName();
        buyer.stateCode = po.getBuyerStateCode();
        buyer.email = po.getBuyerEmail();
        buyer.website = po.getBuyerWebsite();
        detail.buyer = buyer;

        PurchaseOrderDtos.Supplier supplier = new PurchaseOrderDtos.Supplier();
        supplier.name = po.getSupplierName();
        supplier.address = po.getSupplierAddress();
        supplier.gstin = po.getSupplierGstin();
        supplier.stateName = po.getSupplierStateName();
        supplier.stateCode = po.getSupplierStateCode();
        supplier.email = po.getSupplierEmail();
        supplier.whatsapp = po.getSupplierWhatsapp();
        detail.supplier = supplier;

        PurchaseOrderDtos.Meta meta = new PurchaseOrderDtos.Meta();
        meta.referenceNumberAndDate = po.getReferenceNumberAndDate();
        meta.paymentTerms = po.getPaymentTerms();
        meta.dispatchedThrough = po.getDispatchedThrough();
        meta.destination = po.getDestination();
        meta.otherReferences = po.getOtherReferences();
        meta.termsOfDelivery = po.getTermsOfDelivery();
        detail.meta = meta;

        PurchaseOrderDtos.Totals totals = new PurchaseOrderDtos.Totals();
        totals.subTotal = po.getSubTotal();
        totals.cgstRate = po.getCgstRate();
        totals.cgstAmount = po.getCgstAmount();
        totals.sgstRate = po.getSgstRate();
        totals.sgstAmount = po.getSgstAmount();
        totals.grandTotal = po.getGrandTotal();
        detail.totals = totals;

        detail.amountInWords = po.getAmountInWords();
        detail.companyPan = po.getCompanyPan();

        List<PurchaseOrderLine> sourceLines = lines != null ? lines
                : purchaseOrderLineRepo.findByTenantIdAndPurchaseOrder_IdOrderByLineNumberAsc(po.getTenantId(), po.getId());
        for (PurchaseOrderLine line : sourceLines) {
            PurchaseOrderDtos.Item dto = new PurchaseOrderDtos.Item();
            dto.description = line.getDescription();
            dto.quantity = line.getQuantity();
            dto.unit = line.getUnit();
            dto.rate = line.getRate();
            dto.amount = line.getAmount();
            detail.items.add(dto);
        }
        return detail;
    }

    private LocalDate parsePoDate(String value) {
        if (value == null || value.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception ex) {
            throw new BusinessException("Invalid purchase order date");
        }
    }

    private static BigDecimal normalizeAmount(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal normalizeRate(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal normalizeQuantity(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void hydrateProposal(Proposal p) {
        if (p == null) return;
        if (p.getCustomer() != null) {
            p.getCustomer().getName();
        }
        if (p.getKit() != null) {
            p.getKit().getName();
        }
        if (p.getApprovedBy() != null) {
            p.getApprovedBy().getDisplayName();
        }

        List<ProposalItem> lines = proposalItemRepo.findByTenantIdAndProposal_Id(p.getTenantId(), p.getId());
        if (!lines.isEmpty()) {
            BigDecimal subtotal = BigDecimal.ZERO;
            BigDecimal tax = BigDecimal.ZERO;
            for (ProposalItem line : lines) {
                if (line.getAmount() != null) {
                    subtotal = subtotal.add(line.getAmount());
                }
                BigDecimal lineTax = null;
                if (line.getTaxAmount() != null) {
                    lineTax = line.getTaxAmount();
                } else if (line.getTaxRate() != null && line.getAmount() != null) {
                    lineTax = line.getAmount()
                            .multiply(line.getTaxRate())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                }
                if (lineTax != null) {
                    tax = tax.add(lineTax);
                }
            }

            BigDecimal total = subtotal.add(tax);
            boolean updated = false;

            if (p.getSubtotal() == null || p.getSubtotal().compareTo(subtotal) != 0) {
                p.setSubtotal(subtotal);
                updated = true;
            }
            if (p.getTax() == null || p.getTax().compareTo(tax) != 0) {
                p.setTax(tax);
                updated = true;
            }
            if (p.getTotal() == null || p.getTotal().compareTo(total) != 0) {
                p.setTotal(total);
                updated = true;
            }

            if (updated) {
                proposalRepo.save(p);
            }
        }
    }

    private void hydrateServiceRequest(ServiceRequest sr) {
        if (sr == null) return;
        if (sr.getCustomer() != null) {
            sr.getCustomer().getName();
        }
        if (sr.getProposal() != null) {
            sr.getProposal().getId();
            if (sr.getProposal().getCustomer() != null) {
                sr.getProposal().getCustomer().getName();
            }
        }
    }

    private void hydrateWorkOrder(WorkOrder wo) {
        if (wo == null) return;
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
        Map<Long, List<WorkOrderProgressAttachment>> attachmentsByProgress = Map.of();
        List<Long> progressIds = progress.stream()
            .map(WorkOrderProgress::getId)
            .filter(idVal -> idVal != null)
            .toList();
        if (!progressIds.isEmpty()) {
            attachmentsByProgress = progressAttachmentRepo
                .findByTenantIdAndProgress_IdIn(tid, progressIds)
                .stream()
                .filter(att -> att.getProgress() != null && att.getProgress().getId() != null)
                .collect(Collectors.groupingBy(att -> att.getProgress().getId()));
        }

        Map<String, Object> out = new HashMap<>();
        out.put("workOrder", wo);
        out.put("assignments", assignments);
        out.put("progress", summariseProgress(progress, attachmentsByProgress));
        out.put("progressSummary", buildProgressSummary(progress, attachmentsByProgress));
        return ResponseEntity.ok(out);
    }

    public ResponseEntity<byte[]> downloadProgressAttachment(Long woId, Long progressId, Long attachmentId) {
        Long tid = tenant();
        WorkOrderProgressAttachment attachment = progressAttachmentRepo
            .findByTenantIdAndId(tid, attachmentId)
            .orElseThrow(() -> new NotFoundException("Attachment not found"));
        WorkOrderProgress progress = attachment.getProgress();
        if (progress == null || progress.getWorkOrder() == null) {
            throw new NotFoundException("Progress entry not found for attachment");
        }
        WorkOrder wo = progress.getWorkOrder();
        if (!tid.equals(wo.getTenantId())) {
            throw new BusinessException("Cross-tenant access");
        }
        if (!woId.equals(wo.getId())) {
            throw new BusinessException("Attachment does not belong to the work order");
        }
        if (!progressId.equals(progress.getId())) {
            throw new BusinessException("Attachment does not belong to the progress entry");
        }
        byte[] data = attachment.getData();
        if (data == null) {
            data = new byte[0];
        }
        String filename = attachment.getFilename() != null ? attachment.getFilename() : "progress-photo";
        String contentType = attachment.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename.replace("\"", "") + "\"")
            .contentType(MediaType.parseMediaType(contentType))
            .body(data);
    }

    public ResponseEntity<byte[]> completionReport(Long workOrderId) {
        Long tid = tenant();
        WorkOrder wo = workOrderRepo.findById(workOrderId)
            .orElseThrow(() -> new NotFoundException("Work order not found"));
        if (!tid.equals(wo.getTenantId())) {
            throw new BusinessException("Cross-tenant access");
        }

        touchWorkOrderAssociations(wo);

        List<WorkOrderProgress> progress = woProgressRepo
            .findByTenantIdAndWorkOrder_IdOrderByCreatedAtAsc(tid, workOrderId);
        List<Long> progressIds = progress.stream()
            .map(WorkOrderProgress::getId)
            .filter(Objects::nonNull)
            .toList();
        if (!progressIds.isEmpty()) {
            Map<Long, List<WorkOrderProgressAttachment>> attachments = progressAttachmentRepo
                .findByTenantIdAndProgress_IdIn(tid, progressIds)
                .stream()
                .filter(att -> att.getProgress() != null && att.getProgress().getId() != null)
                .collect(Collectors.groupingBy(att -> att.getProgress().getId()));
            for (WorkOrderProgress entry : progress) {
                List<WorkOrderProgressAttachment> att = attachments.get(entry.getId());
                if (att != null) {
                    att.forEach(entry::addAttachment);
                }
            }
        }

        byte[] pdf = PdfUtil.buildCompletionReportPdf(wo, progress);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=completion-report-" + wo.getWan() + ".pdf")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    private void touchWorkOrderAssociations(WorkOrder wo) {
        if (wo == null) {
            return;
        }
        if (wo.getServiceRequest() != null) {
            wo.getServiceRequest().getId();
            wo.getServiceRequest().getSrn();
            wo.getServiceRequest().getDescription();
            if (wo.getServiceRequest().getCustomer() != null) {
                wo.getServiceRequest().getCustomer().getId();
                wo.getServiceRequest().getCustomer().getName();
                wo.getServiceRequest().getCustomer().getEmail();
                wo.getServiceRequest().getCustomer().getMobile();
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
    }

    private List<Map<String, Object>> summariseProgress(List<WorkOrderProgress> progress,
                                                        Map<Long, List<WorkOrderProgressAttachment>> attachmentsByProgress) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (WorkOrderProgress p : progress) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("status", p.getStatus() != null ? p.getStatus().name() : null);
            map.put("remarks", p.getRemarks());
            map.put("photoUrl", p.getPhotoUrl());
            map.put("createdAt", p.getCreatedAt());
            if (p.getByFE() != null) {
                Map<String, Object> fe = new HashMap<>();
                fe.put("id", p.getByFE().getId());
                if (p.getByFE().getUser() != null) {
                    fe.put("displayName", p.getByFE().getUser().getDisplayName());
                }
                map.put("byFE", fe);
            }
            Long progressId = p.getId();
            Long woId = p.getWorkOrder() != null ? p.getWorkOrder().getId() : null;
            List<Map<String, Object>> attachmentViews = attachmentsByProgress
                .getOrDefault(progressId, List.of())
                .stream()
                .map(att -> {
                    Map<String, Object> attMap = new HashMap<>();
                    attMap.put("id", att.getId());
                    attMap.put("filename", att.getFilename());
                    attMap.put("contentType", att.getContentType());
                    attMap.put("size", att.getSize());
                    attMap.put("uploadedAt", att.getUploadedAt());
                    if (woId != null && progressId != null && att.getId() != null) {
                        attMap.put("downloadPath", String.format("/office/wo/%d/progress/%d/attachments/%d", woId, progressId, att.getId()));
                    }
                    return attMap;
                })
                .collect(Collectors.toList());
            map.put("attachments", attachmentViews);
            list.add(map);
        }
        return list;
    }

    private Map<String, Object> buildProgressSummary(List<WorkOrderProgress> progress,
                                                     Map<Long, List<WorkOrderProgressAttachment>> attachmentsByProgress) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalUpdates", progress.size());
        summary.put("photoCount", attachmentsByProgress.values().stream().mapToInt(List::size).sum());
        if (progress.isEmpty()) {
            summary.put("lastUpdatedAt", null);
            summary.put("lastStatus", null);
        } else {
            WorkOrderProgress latest = progress.get(progress.size() - 1);
            summary.put("lastUpdatedAt", latest.getCreatedAt());
            summary.put("lastStatus", latest.getStatus() != null ? latest.getStatus().name() : null);
        }
        return summary;
    }

    public ResponseEntity<Void> assignFe(Long id, AssignFERequest body) {
        workOrders.assignFe(tenant(), id, body.feId, body.note);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Void> addProgress(Long id, ProgressRequest req) {
        WorkOrderService.ProgressAttachment attachment;
        try {
            attachment = req.toAttachment();
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(ex.getMessage());
        }
        workOrders.addProgress(tenant(), id, req.status, req.byFeId, req.remarks, req.photoUrl, attachment);
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<Map<String, Object>> woSummary() {
        Long tenantId = tenant();

        Map<String, Long> counts = new LinkedHashMap<>();
        long total = 0L;
        for (WOStatus status : WOStatus.values()) {
            long count = workOrderRepo.countByTenantIdAndStatus(tenantId, status);
            counts.put(status.name(), count);
            total += count;
        }

        long activeCount = counts.entrySet().stream()
            .filter(entry -> ACTIVE_WO_STATUSES.contains(WOStatus.valueOf(entry.getKey())))
            .mapToLong(Map.Entry::getValue)
            .sum();

        long overdue = workOrderRepo.countByTenantIdAndStatusInAndDueDateBefore(
            tenantId,
            ACTIVE_WO_STATUSES,
            LocalDate.now()
        );

        Optional<WorkOrder> latest = workOrderRepo.findTop1ByTenantIdOrderByUpdatedAtDesc(tenantId);
        Instant lastUpdatedAt = latest.map(WorkOrder::getUpdatedAt).orElse(null);
        String lastUpdatedWan = latest.map(WorkOrder::getWan).orElse(null);

        double avgCompletionDays = computeAverageCompletionDays(tenantId);
        double completionRate = total == 0
            ? 0d
            : BigDecimal.valueOf(counts.getOrDefault(WOStatus.COMPLETED.name(), 0L) * 100d / total)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();

        Map<String, Object> body = new HashMap<>();
        body.put("counts", counts);
        body.put("total", total);
        body.put("active", activeCount);
        body.put("overdue", overdue);
        body.put("completionRate", completionRate);
        body.put("avgCompletionDays", avgCompletionDays);
        body.put("lastUpdatedAt", lastUpdatedAt);
        body.put("lastUpdatedWan", lastUpdatedWan);
        body.put("engineerLoads", buildEngineerLoads(tenantId));
        body.put("upcomingDue", buildUpcomingDue(tenantId));
        return ResponseEntity.ok(body);
    }

    private double computeAverageCompletionDays(Long tenantId) {
        List<WorkOrder> recentCompleted = workOrderRepo
            .findTop25ByTenantIdAndStatusOrderByUpdatedAtDesc(tenantId, WOStatus.COMPLETED);
        if (recentCompleted.isEmpty()) {
            return 0d;
        }
        double average = recentCompleted.stream()
            .map(wo -> {
                Instant created = wo.getCreatedAt();
                Instant updated = wo.getUpdatedAt();
                if (created == null || updated == null) {
                    return null;
                }
                double hours = Duration.between(created, updated).toHours();
                return hours / 24d;
            })
            .filter(Objects::nonNull)
            .mapToDouble(Double::doubleValue)
            .average()
            .orElse(0d);
        return BigDecimal.valueOf(average).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    private List<Map<String, Object>> buildEngineerLoads(Long tenantId) {
        List<WorkOrder> active = workOrderRepo
            .findTop100ByTenantIdAndStatusInOrderByUpdatedAtDesc(tenantId, ACTIVE_WO_STATUSES);
        if (active.isEmpty()) {
            return List.of();
        }
        LocalDate today = LocalDate.now();
        Map<Long, EngineerLoadAccumulator> accumulator = new LinkedHashMap<>();
        for (WorkOrder workOrder : active) {
            FieldEngineer fe = workOrder.getAssignedFE();
            if (fe == null || fe.getId() == null) {
                continue;
            }
            fe.getId();
            if (fe.getUser() != null) {
                fe.getUser().getDisplayName();
            }
            EngineerLoadAccumulator load = accumulator.computeIfAbsent(
                fe.getId(),
                id -> new EngineerLoadAccumulator(id, resolveEngineerName(fe))
            );
            load.activeCount++;
            if (isOverdue(workOrder, today)) {
                load.overdueCount++;
            }
            LocalDate dueDate = workOrder.getDueDate();
            if (dueDate != null && (load.nextDue == null || dueDate.isBefore(load.nextDue))) {
                load.nextDue = dueDate;
            }
            Instant updatedAt = workOrder.getUpdatedAt();
            if (updatedAt != null && (load.latestUpdate == null || updatedAt.isAfter(load.latestUpdate))) {
                load.latestUpdate = updatedAt;
            }
        }

        return accumulator.values().stream()
            .sorted(Comparator
                .comparingInt((EngineerLoadAccumulator e) -> e.activeCount)
                .reversed())
            .map(EngineerLoadAccumulator::toView)
            .collect(Collectors.toList());
    }

    private List<Map<String, Object>> buildUpcomingDue(Long tenantId) {
        List<WorkOrder> dueSoon = workOrderRepo
            .findTop50ByTenantIdAndStatusInOrderByDueDateAsc(tenantId, ACTIVE_WO_STATUSES);
        if (dueSoon.isEmpty()) {
            return List.of();
        }
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> list = new ArrayList<>();
        for (WorkOrder workOrder : dueSoon) {
            LocalDate due = workOrder.getDueDate();
            if (due == null) {
                continue;
            }
            FieldEngineer fe = workOrder.getAssignedFE();
            if (fe != null) {
                fe.getId();
                if (fe.getUser() != null) {
                    fe.getUser().getDisplayName();
                }
            }
            ServiceRequest sr = workOrder.getServiceRequest();
            if (sr != null) {
                sr.getId();
                if (sr.getCustomer() != null) {
                    sr.getCustomer().getId();
                    sr.getCustomer().getName();
                }
            }
            Map<String, Object> view = new HashMap<>();
            view.put("id", workOrder.getId());
            view.put("wan", workOrder.getWan());
            view.put("status", workOrder.getStatus() != null ? workOrder.getStatus().name() : null);
            view.put("dueDate", due);
            view.put("overdue", isOverdue(workOrder, today));
            view.put("assignedFe", resolveEngineerName(fe));
            view.put("customer", sr != null && sr.getCustomer() != null ? sr.getCustomer().getName() : null);
            list.add(view);
        }
        list.sort(Comparator.comparing((Map<String, Object> m) -> (LocalDate) m.get("dueDate")));
        return list;
    }

    private boolean isOverdue(WorkOrder workOrder, LocalDate today) {
        if (workOrder == null) {
            return false;
        }
        if (workOrder.getStatus() == WOStatus.COMPLETED) {
            return false;
        }
        LocalDate due = workOrder.getDueDate();
        return due != null && due.isBefore(today);
    }

    private String resolveEngineerName(FieldEngineer fe) {
        if (fe == null) {
            return null;
        }
        String name = fe.getName();
        if (name != null && !name.isBlank()) {
            return name;
        }
        if (fe.getUser() != null && fe.getUser().getDisplayName() != null && !fe.getUser().getDisplayName().isBlank()) {
            return fe.getUser().getDisplayName();
        }
        if (fe.getUser() != null && fe.getUser().getEmail() != null) {
            return fe.getUser().getEmail();
        }
        return "Engineer #" + fe.getId();
    }

    private static final class EngineerLoadAccumulator {
        private final long feId;
        private final String name;
        private int activeCount;
        private int overdueCount;
        private LocalDate nextDue;
        private Instant latestUpdate;

        private EngineerLoadAccumulator(long feId, String name) {
            this.feId = feId;
            this.name = name;
        }

        private Map<String, Object> toView() {
            Map<String, Object> view = new HashMap<>();
            view.put("feId", feId);
            view.put("name", name);
            view.put("activeCount", activeCount);
            view.put("overdueCount", overdueCount);
            view.put("nextDue", nextDue);
            view.put("latestUpdate", latestUpdate);
            return view;
        }
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
        // Determine delivery channel based on request. If a WhatsApp number is
        // provided prefer that; otherwise fall back to email. The service layer
        // will mark the invoice as SENT irrespective of channel.
        if (req != null && req.toWhatsapp != null && !req.toWhatsapp.isBlank()) {
            invoices.sendInvoiceViaWhatsapp(tenant(), invoiceId, req.toWhatsapp);
        } else {
            invoices.sendInvoice(tenant(), invoiceId, req != null ? req.toEmail : null);
        }
        return ResponseEntity.noContent().build();
    }

    // ----- Purchase Orders -----
    @Transactional
    public ResponseEntity<PurchaseOrderDtos.Detail> createPurchaseOrder(PurchaseOrderDtos.CreateRequest req) {
        if (req == null) {
            throw new BusinessException("Purchase order payload is required");
        }
        Long tenantId = tenant();
        tenantGuard.assertActive(tenantId);

        PurchaseOrder po = new PurchaseOrder();
        po.setTenantId(tenantId);

        if (req.serviceId != null) {
            var service = serviceRepo.findByTenantIdAndId(tenantId, req.serviceId)
                    .orElseThrow(() -> new NotFoundException("Service not found"));
            po.setService(service);
        }

        po.setVoucherNumber(trimToNull(req.voucherNumber));
        po.setOrderDate(parsePoDate(req.date));

        PurchaseOrderDtos.Party buyer = req.buyer != null ? req.buyer : new PurchaseOrderDtos.Party();
        po.setBuyerName(trimToNull(buyer.name));
        po.setBuyerAddress(trimToNull(buyer.address));
        po.setBuyerPhone(trimToNull(buyer.phone));
        po.setBuyerGstin(trimToNull(buyer.gstin));
        po.setBuyerStateName(trimToNull(buyer.stateName));
        po.setBuyerStateCode(trimToNull(buyer.stateCode));
        po.setBuyerEmail(trimToNull(buyer.email));
        po.setBuyerWebsite(trimToNull(buyer.website));

        PurchaseOrderDtos.Supplier supplier = req.supplier != null ? req.supplier : new PurchaseOrderDtos.Supplier();
        po.setSupplierName(trimToNull(supplier.name));
        po.setSupplierAddress(trimToNull(supplier.address));
        po.setSupplierGstin(trimToNull(supplier.gstin));
        po.setSupplierStateName(trimToNull(supplier.stateName));
        po.setSupplierStateCode(trimToNull(supplier.stateCode));
        po.setSupplierEmail(trimToNull(supplier.email));
        po.setSupplierWhatsapp(trimToNull(supplier.whatsapp));

        PurchaseOrderDtos.Meta meta = req.meta != null ? req.meta : new PurchaseOrderDtos.Meta();
        po.setReferenceNumberAndDate(trimToNull(meta.referenceNumberAndDate));
        po.setPaymentTerms(trimToNull(meta.paymentTerms));
        po.setDispatchedThrough(trimToNull(meta.dispatchedThrough));
        po.setDestination(trimToNull(meta.destination));
        po.setOtherReferences(trimToNull(meta.otherReferences));
        po.setTermsOfDelivery(trimToNull(meta.termsOfDelivery));

        PurchaseOrderDtos.Totals totals = req.totals != null ? req.totals : new PurchaseOrderDtos.Totals();
        po.setSubTotal(normalizeAmount(totals.subTotal));
        po.setCgstRate(normalizeRate(totals.cgstRate));
        po.setCgstAmount(normalizeAmount(totals.cgstAmount));
        po.setSgstRate(normalizeRate(totals.sgstRate));
        po.setSgstAmount(normalizeAmount(totals.sgstAmount));
        po.setGrandTotal(normalizeAmount(totals.grandTotal));
        po.setAmountInWords(trimToNull(req.amountInWords));
        po.setCompanyPan(trimToNull(req.companyPan));

        PurchaseOrder saved = purchaseOrderRepo.save(po);

        List<PurchaseOrderLine> lines = new ArrayList<>();
        List<PurchaseOrderDtos.Item> reqItems = req.items != null ? req.items : List.of();
        int index = 1;
        for (PurchaseOrderDtos.Item item : reqItems) {
            if (item == null) continue;
            PurchaseOrderLine line = new PurchaseOrderLine();
            line.setTenantId(tenantId);
            line.setPurchaseOrder(saved);
            line.setLineNumber(index++);
            line.setDescription(trimToNull(item.description));
            line.setQuantity(normalizeQuantity(item.quantity));
            line.setUnit(trimToNull(item.unit));
            line.setRate(normalizeAmount(item.rate));
            line.setAmount(normalizeAmount(item.amount));
            lines.add(line);
        }
        if (!lines.isEmpty()) {
            purchaseOrderLineRepo.saveAll(lines);
        }

        return ResponseEntity.ok(toPurchaseOrderDetail(saved, lines));
    }

    public ResponseEntity<Page<PurchaseOrderDtos.ListItem>> listPurchaseOrders(Long serviceId, int page, int size, String sort) {
        Long tenantId = tenant();
        Pageable pageable = buildPageRequest(page, size, sort, "createdAt");
        Page<PurchaseOrder> data = (serviceId != null)
                ? purchaseOrderRepo.findByTenantIdAndService_Id(tenantId, serviceId, pageable)
                : purchaseOrderRepo.findByTenantId(tenantId, pageable);
        Page<PurchaseOrderDtos.ListItem> mapped = data.map(this::toPurchaseOrderListItem);
        return ResponseEntity.ok(mapped);
    }

    public ResponseEntity<PurchaseOrderDtos.Detail> getPurchaseOrder(Long id) {
        Long tenantId = tenant();
        PurchaseOrder po = purchaseOrderRepo.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));
        List<PurchaseOrderLine> lines = purchaseOrderLineRepo
                .findByTenantIdAndPurchaseOrder_IdOrderByLineNumberAsc(tenantId, id);
        return ResponseEntity.ok(toPurchaseOrderDetail(po, lines));
    }

    public ResponseEntity<byte[]> downloadPurchaseOrderPdf(Long id) {
        Long tenantId = tenant();
        PurchaseOrder po = purchaseOrderRepo.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));
        List<PurchaseOrderLine> lines = purchaseOrderLineRepo
                .findByTenantIdAndPurchaseOrder_IdOrderByLineNumberAsc(tenantId, id);
        byte[] pdf = PdfUtil.buildPurchaseOrderPdf(po, lines);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentLength(pdf.length);
        String filename = "purchase-order-" + (po.getVoucherNumber() != null && !po.getVoucherNumber().isBlank()
                ? po.getVoucherNumber().replaceAll("[^A-Za-z0-9-_]", "_")
                : String.valueOf(po.getId())) + ".pdf";
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build());
        headers.add(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, "Content-Disposition");
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    @Transactional(noRollbackFor = Exception.class)
    public ResponseEntity<Void> sendPurchaseOrder(Long id, PurchaseOrderDtos.SendRequest req) {
        Long tenantId = tenant();
        PurchaseOrder po = purchaseOrderRepo.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));
        List<PurchaseOrderLine> lines = purchaseOrderLineRepo
                .findByTenantIdAndPurchaseOrder_IdOrderByLineNumberAsc(tenantId, id);
        byte[] pdf = PdfUtil.buildPurchaseOrderPdf(po, lines);

        String subject = "Purchase Order " + (po.getVoucherNumber() != null ? po.getVoucherNumber() : po.getId());
        String body = "Please find attached purchase order.";

        String whatsapp = trimToNull(req != null ? req.toWhatsapp : null);
        if (whatsapp != null) {
            emailService.send(tenantId, whatsapp, subject, body, "PURCHASE_ORDER", po.getId(), false);
            return ResponseEntity.noContent().build();
        }

        String email = trimToNull(req != null ? req.toEmail : null);
        if (email == null) {
            email = trimToNull(po.getSupplierEmail());
        }
        if (email == null) {
            throw new BusinessException("Supplier email is required to send the purchase order");
        }

        String filename = "purchase-order-" + (po.getVoucherNumber() != null && !po.getVoucherNumber().isBlank()
                ? po.getVoucherNumber().replaceAll("[^A-Za-z0-9-_]", "_")
                : String.valueOf(po.getId())) + ".pdf";
        emailService.sendWithAttachment(tenantId, email, subject, body, filename, pdf,
                MediaType.APPLICATION_PDF_VALUE, EmailEntityType.PURCHASE_ORDER, po.getId());
        return ResponseEntity.noContent().build();
    }

    public ResponseEntity<List<PurchaseOrderDtos.Detail>> purchaseOrderSuggestions(String keyword, int limit) {
        Long tenantId = tenant();
        int safeLimit = Math.max(1, Math.min(limit <= 0 ? 5 : limit, 10));
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");
        Pageable suggestionPage = PageRequest.of(0, safeLimit, sort);
        List<PurchaseOrder> seeds;
        if (keyword != null && !keyword.isBlank()) {
            seeds = purchaseOrderRepo.searchTopByKeyword(tenantId, keyword.trim(), suggestionPage);
        } else {
            seeds = purchaseOrderRepo.findByTenantId(tenantId, suggestionPage).getContent();
        }

        List<PurchaseOrderDtos.Detail> suggestions = new ArrayList<>();
        java.util.Set<Long> seen = new java.util.LinkedHashSet<>();
        for (PurchaseOrder po : seeds) {
            if (po.getId() == null || !seen.add(po.getId())) {
                continue;
            }
            List<PurchaseOrderLine> lines = purchaseOrderLineRepo
                    .findByTenantIdAndPurchaseOrder_IdOrderByLineNumberAsc(tenantId, po.getId());
            suggestions.add(toPurchaseOrderDetail(po, lines));
            if (suggestions.size() >= safeLimit) {
                break;
            }
        }
        return ResponseEntity.ok(suggestions);
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
        // When creating a kit we ignore the tenantId on the request and instead
        // derive it from the current security context. This prevents callers from
        // accidentally creating kits for another tenant and mirrors how other
        // entities are created throughout the system.
        Kit k = new Kit();
        Long tenantId = tenant();
        if (tenantId != null) k.setTenantId(tenantId);
        else if (req.tenantId != null) k.setTenantId(req.tenantId);
        else throw new BusinessException("Tenant ID is required");
        k.setName(req.name);
        k.setDescription(req.description);
        k.setServiceType(req.serviceType);
        k.setPrice(req.price);
        // Copy optional attributes from the request
        if (req.code != null && !req.code.isBlank()) {
            k.setCode(req.code);
        }
        if (req.hsnSac != null && !req.hsnSac.isBlank()) {
            k.setHsnSac(req.hsnSac);
        }
        if (req.brand != null) k.setBrand(req.brand);
        if (req.voltageKV != null) k.setVoltageKV(req.voltageKV);
        if (req.cores != null) k.setCores(req.cores);
        if (req.sizeSqmm != null) k.setSizeSqmm(req.sizeSqmm);
        if (req.category != null) k.setCategory(req.category);
        if (req.material != null) k.setMaterial(req.material);
        // Set default HSN code if not already set on the entity
        if (k.getHsnSac() == null || k.getHsnSac().isBlank()) {
            k.setHsnSac("854690");
        }
        // Generate a code if one is not provided. Use a simple concatenation
        // of the service type and the current timestamp to ensure uniqueness.
        if (k.getCode() == null || k.getCode().isBlank()) {
            String prefix = req.serviceType != null ? req.serviceType.name() : "KIT";
            k.setCode(prefix + "-" + System.currentTimeMillis());
        }
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

    /**
     * Update an existing kit. Only non‑null fields on the body are applied
     * to the entity. In addition to the name, description, serviceType and
     * price fields, this method also supports optional catalogue fields
     * such as code, hsnSac, brand, voltageKV, cores, sizeSqmm, category and
     * material. Unknown keys are ignored. Throws NotFoundException if the
     * kit does not exist or belongs to another tenant.
     */
    @Transactional
    public ResponseEntity<Kit> updateKit(Long id, Map<String, Object> body) {
        Kit kit = kitRepo.findById(id).orElseThrow(() -> new NotFoundException("Kit not found"));
        // Ensure the kit belongs to the current tenant; throw if not
        if (!tenant().equals(kit.getTenantId())) {
            throw new BusinessException("Cross-tenant access");
        }
        if (body != null) {
            // Standard fields
            if (body.containsKey("name")) {
                kit.setName((String) body.get("name"));
            }
            if (body.containsKey("description")) {
                kit.setDescription((String) body.get("description"));
            }
            if (body.containsKey("serviceType")) {
                Object st = body.get("serviceType");
                if (st != null) {
                    try {
                        kit.setServiceType(ServiceTypeCode.valueOf(st.toString()));
                    } catch (Exception ignored) {
                        // ignore invalid enum values
                    }
                }
            }
            if (body.containsKey("price")) {
                Object p = body.get("price");
                if (p != null) {
                    try {
                        kit.setPrice(new java.math.BigDecimal(p.toString()));
                    } catch (Exception ignored) {
                        // ignore invalid numbers
                    }
                }
            }
            // Optional catalogue fields
            if (body.containsKey("code")) {
                Object v = body.get("code");
                String code = v != null ? v.toString().trim() : null;
                kit.setCode(code == null || code.isEmpty() ? null : code);
            }
            if (body.containsKey("hsnSac")) {
                Object v = body.get("hsnSac");
                String hsn = v != null ? v.toString().trim() : null;
                kit.setHsnSac(hsn == null || hsn.isEmpty() ? null : hsn);
            }
            if (body.containsKey("brand")) {
                Object v = body.get("brand");
                String brand = v != null ? v.toString().trim() : null;
                kit.setBrand(brand == null || brand.isEmpty() ? null : brand);
            }
            if (body.containsKey("voltageKV")) {
                Object v = body.get("voltageKV");
                String voltage = v != null ? v.toString().trim() : null;
                kit.setVoltageKV(voltage == null || voltage.isEmpty() ? null : voltage);
            }
            if (body.containsKey("cores")) {
                Object v = body.get("cores");
                String cores = v != null ? v.toString().trim() : null;
                kit.setCores(cores == null || cores.isEmpty() ? null : cores);
            }
            if (body.containsKey("sizeSqmm")) {
                Object v = body.get("sizeSqmm");
                if (v == null || v.toString().trim().isEmpty()) {
                    kit.setSizeSqmm(null);
                } else {
                    try {
                        kit.setSizeSqmm(Integer.valueOf(v.toString()));
                    } catch (Exception ignored) {
                        // ignore invalid numbers
                    }
                }
            }
            if (body.containsKey("category")) {
                Object v = body.get("category");
                String cat = v != null ? v.toString().trim() : null;
                kit.setCategory(cat == null || cat.isEmpty() ? null : cat);
            }
            if (body.containsKey("material")) {
                Object v = body.get("material");
                String mat = v != null ? v.toString().trim() : null;
                kit.setMaterial(mat == null || mat.isEmpty() ? null : mat);
            }
        }
        Kit saved = kitRepo.save(kit);
        return ResponseEntity.ok(saved);
    }

    /**
     * Delete a kit and its associated kit items. Throws NotFoundException if
     * the kit does not exist or belongs to another tenant.
     */
    @Transactional
    public ResponseEntity<Void> deleteKit(Long id) {
        Kit kit = kitRepo.findById(id).orElseThrow(() -> new NotFoundException("Kit not found"));
        // Ensure the kit belongs to the current tenant; throw if not
        if (!tenant().equals(kit.getTenantId())) {
            throw new BusinessException("Cross-tenant access");
        }
        // Delete all kit items belonging to this kit
        List<KitItem> items = kitItemRepo.findAll().stream()
                .filter(i -> i.getKit().getId().equals(id))
                .toList();
        for (KitItem item : items) {
            kitItemRepo.delete(item);
        }
        kitRepo.delete(kit);
        return ResponseEntity.noContent().build();
    }

    /**
     * Update a kit item's quantity. Only the qty field is supported. Throws
     * NotFoundException if the kit item does not exist or belongs to another tenant.
     */
    @Transactional
    public ResponseEntity<KitItem> updateKitItem(Long id, Map<String, Object> body) {
        KitItem ki = kitItemRepo.findById(id).orElseThrow(() -> new NotFoundException("Kit item not found"));
        // Ensure the kit item belongs to the current tenant; throw if not
        if (!tenant().equals(ki.getTenantId())) {
            throw new BusinessException("Cross-tenant access");
        }
        if (body != null && body.containsKey("qty")) {
            Object q = body.get("qty");
            if (q != null) ki.setQty(new java.math.BigDecimal(q.toString()));
        }
        KitItem saved = kitItemRepo.save(ki);
        return ResponseEntity.ok(saved);
    }

    /**
     * Delete a kit item. Throws NotFoundException if the kit item does not exist
     * or belongs to another tenant.
     */
    @Transactional
    public ResponseEntity<Void> deleteKitItem(Long id) {
        KitItem ki = kitItemRepo.findById(id).orElseThrow(() -> new NotFoundException("Kit item not found"));
        // Ensure the kit item belongs to the current tenant; throw if not
        if (!tenant().equals(ki.getTenantId())) {
            throw new BusinessException("Cross-tenant access");
        }
        kitItemRepo.delete(ki);
        return ResponseEntity.noContent().build();
    }

    public List<Item> listItems(Long tenantId) { return itemRepo.findByTenantId(tenantId); }

    public List<Kit> listKits(Long tenantId) { return kitRepo.findByTenantId(tenantId); }

    /**
     * List items for the current tenant. This overload derives the tenant ID
     * from the security context instead of requiring a request parameter.
     */
    public List<Item> listItems() {
        return itemRepo.findByTenantId(tenant());
    }

    /**
     * List kits for the current tenant. This overload derives the tenant ID
     * from the security context instead of requiring a request parameter.
     */
    public List<Kit> listKits() {
        return kitRepo.findByTenantId(tenant());
    }

    /**
     * Bulk create kits. Each input record should conform to
     * {@link CreateKitRequest}. The tenant ID on each DTO is ignored and
     * replaced with the current tenant. Missing codes or HSN values will be
     * defaulted in the same way as {@link #createKit(CreateKitRequest)}.
     */
    @Transactional
    public void bulkCreateKits(List<CreateKitRequest> kits) {
        if (kits == null || kits.isEmpty()) return;
        Long tenantId = tenant();
        if (tenantId == null) throw new BusinessException("Tenant ID is required");
        for (CreateKitRequest req : kits) {
            Kit k = new Kit();
            k.setTenantId(tenantId);
            k.setName(req.name);
            k.setDescription(req.description);
            k.setServiceType(req.serviceType);
            k.setPrice(req.price);
            // Copy optional attributes from the request
            if (req.code != null && !req.code.isBlank()) {
                k.setCode(req.code);
            }
            if (req.hsnSac != null && !req.hsnSac.isBlank()) {
                k.setHsnSac(req.hsnSac);
            }
            if (req.brand != null) k.setBrand(req.brand);
            if (req.voltageKV != null) k.setVoltageKV(req.voltageKV);
            if (req.cores != null) k.setCores(req.cores);
            if (req.sizeSqmm != null) k.setSizeSqmm(req.sizeSqmm);
            if (req.category != null) k.setCategory(req.category);
            if (req.material != null) k.setMaterial(req.material);
            // Apply defaults if values remain missing
            if (k.getHsnSac() == null || k.getHsnSac().isBlank()) {
                k.setHsnSac("854690");
            }
            if (k.getCode() == null || k.getCode().isBlank()) {
                String prefix = req.serviceType != null ? req.serviceType.name() : "KIT";
                k.setCode(prefix + "-" + System.currentTimeMillis());
            }
            kitRepo.save(k);
        }
    }

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

    // Generate and attach a PDF to the proposal (visible in office and customer portal)
@org.springframework.transaction.annotation.Transactional
public ResponseEntity<Document> generateProposalPdf(Long proposalId, ProposalPdfRequest req) {
    Long tid = tenant();
    tenantGuard.assertActive(tid);

    Proposal p = proposalRepo.findByTenantIdAndId(tid, proposalId)
        .orElseThrow(() -> new NotFoundException("Proposal not found"));
    var items = proposalItemRepo.findByTenantIdAndProposal_Id(tid, proposalId);
    var customer = p.getCustomer();

    Document d = proposalDocs.generate(tid, p, items, req, customer);
    return ResponseEntity.ok(d);
}

// Share to portal + email. If attachPdf==true, latest PDF must exist.
@org.springframework.transaction.annotation.Transactional
public ResponseEntity<Void> sendProposalEmail(Long proposalId, ProposalShareRequest body, boolean attachPdf) {
    Long tid = tenant();
    tenantGuard.assertActive(tid);

    Proposal p = proposalRepo.findByTenantIdAndId(tid, proposalId)
        .orElseThrow(() -> new NotFoundException("Proposal not found"));

    if (p.getStatus() != ProposalStatus.DRAFT && p.getStatus() != ProposalStatus.REJECTED) {
        throw new BusinessException("Only DRAFT/REJECTED proposals can be sent");
    }
    p.setStatus(com.vebops.domain.enums.ProposalStatus.SENT);
    proposalRepo.save(p);

    String to = (body.toEmail != null && !body.toEmail.isBlank())
        ? body.toEmail
        : (p.getCustomer() != null ? p.getCustomer().getEmail() : null);
    if (to == null || to.isBlank()) throw new BusinessException("Customer email is required");

    // If requested, attach latest proposal PDF
    Document latest = null;
    byte[] pdfBytes = null;
    if (attachPdf) {
        latest = proposalDocs.latestPdf(tid, p.getId());
        if (latest == null) throw new BusinessException("Generate the proposal PDF first");
        // Load the file back for attachment
        java.io.File file = fileStorageService.loadProposalDoc(tid, p.getId(), latest.getId(), latest.getFilename());
        try (var in = new java.io.FileInputStream(file)) {
            pdfBytes = in.readAllBytes();
        } catch (java.io.IOException e) {
            throw new BusinessException("Failed to read proposal PDF for email");
        }
    }

        // Choose template from service type if none provided
    String templateCode = (body.templateCode == null || body.templateCode.isBlank())
        ? switch (p.getServiceType() == null ? ServiceTypeCode.SUPPLY_INSTALL : p.getServiceType()) {
            case SUPPLY -> "PROPOSAL_SUPPLY";
            case SUPPLY_INSTALL -> "PROPOSAL_SUPPLY_INSTALL";
            case INSTALL_ONLY -> "PROPOSAL_INSTALL_ONLY";
            case ERECTION -> "PROPOSAL_ERECTION";
        }
        : body.templateCode;

    // Merge default variables
    java.util.Map<String,Object> vars = new java.util.HashMap<>();
    var tenant = tenantRepo.findById(tid).orElse(null);
    if (tenant != null) vars.put("tenantName", tenant.getName());
    var cust = p.getCustomer();
    if (cust != null) {
        vars.put("customerName", cust.getName());
        vars.put("customerEmail", cust.getEmail());
    }
    vars.put("proposalNo", "P" + p.getId());
    vars.put("proposalId", String.valueOf(p.getId()));
    vars.put("serviceType", p.getServiceType() == null ? "" : p.getServiceType().name());
    vars.put("status", p.getStatus() == null ? "" : p.getStatus().name());
    vars.put("total", p.getTotal() != null ? p.getTotal() : p.getSubtotal());
    if (body.vars != null) vars.putAll(body.vars);

    // Render body with proposal-aware fallback
    String html = emailService.renderProposalTemplate(tid, templateCode, vars, body.viaAi);

    // Try to render subject from template; fallback to generic
    String subj = "Proposal P" + p.getId();
    try {
        var tplOpt = emailTemplateRepo.findByTenantIdAndCode(tid, templateCode);
        if (tplOpt.isPresent()) {
            subj = com.vebops.util.TemplateRenderer.render(tplOpt.get().getSubject(), vars);
        }
    } catch (Exception ignore) {}

    proposalShare.sendToCustomer(tid, p, to, subj, html, attachPdf, latest, pdfBytes);
    return ResponseEntity.noContent().build();
}


}
