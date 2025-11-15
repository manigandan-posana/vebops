package com.vebops.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vebops.context.TenantContext;
import com.vebops.domain.Customer;
import com.vebops.domain.Document;
import com.vebops.domain.Proposal;
import com.vebops.domain.Service;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.domain.enums.ProposalStatus;
import com.vebops.domain.DocumentSequence;
import com.vebops.domain.ServiceRequest;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderAssignment;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.domain.WorkOrderProgressAttachment;
import com.vebops.repository.ServiceRepository;
import com.vebops.repository.ServiceRequestRepository;
import com.vebops.repository.WorkOrderAssignmentRepository;
import com.vebops.repository.WorkOrderProgressRepository;
import com.vebops.repository.WorkOrderProgressAttachmentRepository;
import com.vebops.repository.WorkOrderRepository;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.vebops.service.DocumentSequenceService;
import com.vebops.service.FileStorageService;


/**
 * REST controller for creating simple services. This controller
 * accepts a loosely‑typed payload from the front‑end and persists it
 * into the Service entity. Because the Service entity stores JSON
 * strings for arbitrary payload sections, we only need to serialise
 * the relevant parts and persist them.
 */
@RestController
@RequestMapping("/office/services")
public class ServiceController {

    private static final Logger log = LoggerFactory.getLogger(ServiceController.class);
    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final ServiceRepository repository;
    private final ObjectMapper objectMapper;
    private final com.vebops.repository.CustomerRepository customerRepo;
    private final com.vebops.repository.ProposalRepository proposalRepo;
    private final ServiceRequestRepository serviceRequestRepo;
    private final WorkOrderRepository workOrderRepo;
    private final WorkOrderProgressRepository workOrderProgressRepo;
    private final WorkOrderAssignmentRepository workOrderAssignmentRepo;
    private final WorkOrderProgressAttachmentRepository progressAttachmentRepo;

    private final com.vebops.repository.DocumentRepository documentRepo;
    private final com.vebops.repository.CompanyDetailsRepository companyRepo;
    private final org.springframework.mail.javamail.JavaMailSender mailSender;
    private final com.vebops.service.EmailService emailService;
    private final DocumentSequenceService sequenceService;

    // Storage for persisting generated invoice PDFs.  Files are stored on
    // disk rather than encoded into the database.  Injected via the
    // constructor.
    private final FileStorageService fileStorage;

    public ServiceController(ServiceRepository repository,
                             ObjectMapper objectMapper,
                             com.vebops.repository.CustomerRepository customerRepo,
                             com.vebops.repository.ProposalRepository proposalRepo,
                             ServiceRequestRepository serviceRequestRepo,
                             WorkOrderRepository workOrderRepo,
                             WorkOrderProgressRepository workOrderProgressRepo,
                             WorkOrderAssignmentRepository workOrderAssignmentRepo,
                             WorkOrderProgressAttachmentRepository progressAttachmentRepo,
                             com.vebops.repository.DocumentRepository documentRepo,
                             com.vebops.repository.CompanyDetailsRepository companyRepo,
                             org.springframework.mail.javamail.JavaMailSender mailSender,
                             com.vebops.service.EmailService emailService,
                             DocumentSequenceService sequenceService,
                             FileStorageService fileStorage) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.customerRepo = customerRepo;
        this.proposalRepo = proposalRepo;
        this.serviceRequestRepo = serviceRequestRepo;
        this.workOrderRepo = workOrderRepo;
        this.workOrderProgressRepo = workOrderProgressRepo;
        this.workOrderAssignmentRepo = workOrderAssignmentRepo;
        this.progressAttachmentRepo = progressAttachmentRepo;
        this.documentRepo = documentRepo;
        this.companyRepo = companyRepo;
        this.mailSender = mailSender;
        this.emailService = emailService;
        this.sequenceService = sequenceService;
        this.fileStorage = fileStorage;
    }

    private void normaliseServicePayload(Service service) {
        if (service == null) {
            return;
        }

        Map<String, Object> meta = safeReadMap(service.getMetaJson());
        List<Map<String, Object>> items = safeReadItems(service.getItemsJson());
        Map<String, Object> totals = safeReadMap(service.getTotalsJson());

        boolean shouldPersist = false;
        boolean totalsChanged = false;

        String contact = firstText(meta,
                "buyerContact", "contact", "mobile", "phone", "buyerMobile", "customerMobile", "customerContact");
        if (isBlank(service.getBuyerContact()) && !isBlank(contact)) {
            service.setBuyerContact(contact);
            shouldPersist = true;
        }

        String email = firstText(meta, "buyerEmail", "email", "contactEmail", "customerEmail");
        if (isBlank(service.getBuyerEmail()) && !isBlank(email)) {
            service.setBuyerEmail(email);
            shouldPersist = true;
        }

        if (!items.isEmpty()) {
            BigDecimal subtotal = BigDecimal.ZERO;
            BigDecimal discount = BigDecimal.ZERO;
            BigDecimal tax = BigDecimal.ZERO;

            for (Map<String, Object> line : items) {
                BigDecimal qty = number(firstValue(line, "qty", "quantity", "qtyOrdered", "qtyOrderedUnits"));
                BigDecimal unit = number(firstValue(line, "unitPrice", "price", "rate", "basePrice"));
                BigDecimal explicitLine = number(firstValue(line, "lineTotal", "total", "amount", "lineAmount"));
                BigDecimal explicitPre = number(firstValue(line, "preDiscount", "gross", "grossAmount", "beforeDiscount"));
                BigDecimal discountAmount = number(firstValue(line,
                        "discountAmount", "discountValue", "discountComponent"));
                BigDecimal discountPercent = number(firstValue(line,
                        "discountPercent", "discountRate", "discount"));

                BigDecimal preDiscount = explicitPre;
                if (preDiscount == null && qty != null && unit != null) {
                    preDiscount = unit.multiply(qty);
                }
                if (preDiscount == null && explicitLine != null && discountAmount != null) {
                    preDiscount = explicitLine.add(discountAmount);
                }
                if (preDiscount == null) {
                    preDiscount = explicitLine;
                }

                if (discountAmount == null && discountPercent != null && preDiscount != null) {
                    discountAmount = preDiscount.multiply(discountPercent).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
                }
                if (discountAmount == null && preDiscount != null && explicitLine != null) {
                    BigDecimal diff = preDiscount.subtract(explicitLine);
                    if (diff.compareTo(BigDecimal.ZERO) > 0) {
                        discountAmount = diff;
                    }
                }

                BigDecimal lineTotal = explicitLine;
                if (lineTotal == null && preDiscount != null) {
                    BigDecimal less = discountAmount != null ? discountAmount : BigDecimal.ZERO;
                    lineTotal = preDiscount.subtract(less);
                }

                BigDecimal taxRate = number(firstValue(line, "taxRate", "tax_percent", "gstRate", "igstRate"));
                BigDecimal taxAmount = number(firstValue(line, "taxAmount", "tax", "gstAmount", "igstAmount"));
                if (taxAmount == null && taxRate != null && lineTotal != null) {
                    taxAmount = lineTotal.multiply(taxRate).divide(ONE_HUNDRED, 2, RoundingMode.HALF_UP);
                }

                if (preDiscount != null) {
                    subtotal = subtotal.add(preDiscount);
                } else if (lineTotal != null && discountAmount != null) {
                    subtotal = subtotal.add(lineTotal.add(discountAmount));
                } else if (lineTotal != null) {
                    subtotal = subtotal.add(lineTotal);
                }

                if (discountAmount != null) {
                    discount = discount.add(discountAmount);
                }
                if (taxAmount != null) {
                    tax = tax.add(taxAmount);
                }
            }

            BigDecimal existingSubtotal = number(firstValue(totals,
                    "subtotal", "subTotal", "beforeTax", "totalBeforeTax"));
            BigDecimal existingDiscount = number(firstValue(totals,
                    "discount", "discountAmount", "discountValue", "discountSavings"));
            BigDecimal existingTransport = number(firstValue(totals,
                    "transport", "transportation", "freight", "deliveryCharge"));
            BigDecimal cgstAmount = number(firstValue(totals, "cgst", "cgstAmount"));
            BigDecimal sgstAmount = number(firstValue(totals, "sgst", "sgstAmount"));
            BigDecimal igstAmount = number(firstValue(totals, "igst", "igstAmount"));
            BigDecimal totalTaxField = number(firstValue(totals, "tax", "totalTax", "gstTotal"));

            if (shouldReplace(existingSubtotal, subtotal)) {
                totals.put("subtotal", scale(subtotal));
                totalsChanged = true;
            }

            BigDecimal discountToPersist = discount != null ? discount : BigDecimal.ZERO;
            if (existingDiscount == null || shouldReplace(existingDiscount, discountToPersist)) {
                totals.put("discount", scale(discountToPersist));
                totalsChanged = true;
            }

            BigDecimal transport = existingTransport;
            if (transport == null) {
                transport = number(firstValue(meta, "transport", "transportation", "freight", "deliveryCharge"));
                if (transport != null) {
                    totals.put("transport", scale(transport));
                    totalsChanged = true;
                }
            }
            if (transport == null) {
                transport = BigDecimal.ZERO;
            }

            if (totalTaxField == null && tax != null) {
                totals.put("tax", scale(tax));
                totalTaxField = tax;
                totalsChanged = true;
            }

            boolean hasSplitTax = (cgstAmount != null && cgstAmount.compareTo(BigDecimal.ZERO) > 0)
                    || (sgstAmount != null && sgstAmount.compareTo(BigDecimal.ZERO) > 0)
                    || (igstAmount != null && igstAmount.compareTo(BigDecimal.ZERO) > 0);

            if (!hasSplitTax && tax != null && tax.compareTo(BigDecimal.ZERO) > 0
                    && (igstAmount == null || igstAmount.compareTo(BigDecimal.ZERO) <= 0)) {
                igstAmount = tax;
                totals.put("igst", scale(tax));
                totalsChanged = true;
            }

            BigDecimal taxForGrand = BigDecimal.ZERO;
            if (cgstAmount != null) {
                taxForGrand = taxForGrand.add(cgstAmount);
            }
            if (sgstAmount != null) {
                taxForGrand = taxForGrand.add(sgstAmount);
            }
            if (igstAmount != null) {
                taxForGrand = taxForGrand.add(igstAmount);
            }
            if (taxForGrand.compareTo(BigDecimal.ZERO) == 0 && totalTaxField != null) {
                taxForGrand = taxForGrand.add(totalTaxField);
            }
            if (taxForGrand.compareTo(BigDecimal.ZERO) == 0 && tax != null) {
                taxForGrand = taxForGrand.add(tax);
            }

            BigDecimal effectiveDiscount = discountToPersist;
            BigDecimal computedGrand = subtotal.subtract(effectiveDiscount).add(transport).add(taxForGrand);
            BigDecimal existingGrand = number(firstValue(totals,
                    "grandTotal", "grand", "total", "netTotal"));

            if (shouldReplace(existingGrand, computedGrand)) {
                BigDecimal scaled = scale(computedGrand);
                totals.put("grandTotal", scaled);
                totals.put("total", scaled);
                totals.put("grand", scaled);
                totalsChanged = true;
            }
        }

        if (totalsChanged) {
            try {
                String serialised = objectMapper.writeValueAsString(totals);
                if (!serialised.equals(service.getTotalsJson())) {
                    service.setTotalsJson(serialised);
                    shouldPersist = true;
                }
            } catch (JsonProcessingException e) {
                log.debug("Failed to serialise totals for service {}: {}", service.getId(), e.getMessage());
            }
        }

        if (shouldPersist) {
            try {
                repository.save(service);
            } catch (Exception e) {
                log.debug("Failed to persist normalised service {}: {}", service.getId(), e.getMessage());
            }
        }
    }

    private Map<String, Object> safeReadMap(String json) {
        if (json == null || json.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<LinkedHashMap<String, Object>>() {});
            return parsed != null ? parsed : new LinkedHashMap<>();
        } catch (Exception e) {
            log.debug("Failed to parse service map payload: {}", e.getMessage());
            return new LinkedHashMap<>();
        }
    }

    private List<Map<String, Object>> safeReadItems(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            List<Map<String, Object>> parsed = objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
            return parsed != null ? parsed : Collections.emptyList();
        } catch (Exception e) {
            log.debug("Failed to parse service items payload: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private Object firstValue(Map<String, Object> map, String... keys) {
        if (map == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            if (key == null) continue;
            Object value = map.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof String str && str.trim().isEmpty()) {
                continue;
            }
            return value;
        }
        return null;
    }

    private BigDecimal number(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        if (value instanceof Number num) {
            return new BigDecimal(num.toString());
        }
        if (value instanceof String str) {
            String cleaned = str.trim();
            if (cleaned.isEmpty()) {
                return null;
            }
            cleaned = cleaned.replaceAll("[^0-9.+-]", "");
            if (cleaned.isEmpty() || cleaned.equals("+") || cleaned.equals("-") || cleaned.equals(".")) {
                return null;
            }
            try {
                return new BigDecimal(cleaned);
            } catch (NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }

    private String firstText(Map<String, Object> map, String... keys) {
        if (map == null || keys == null) {
            return null;
        }
        for (String key : keys) {
            if (key == null) continue;
            Object value = map.get(key);
            String str = coerceString(value);
            if (!isBlank(str)) {
                return str;
            }
        }
        return null;
    }

    private String coerceString(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof String str) {
            return str.trim();
        }
        if (value instanceof Number num) {
            BigDecimal bd = new BigDecimal(num.toString());
            return bd.stripTrailingZeros().toPlainString();
        }
        return value.toString().trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private BigDecimal scale(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean shouldReplace(BigDecimal existing, BigDecimal computed) {
        if (computed == null) {
            return false;
        }
        if (existing == null) {
            return true;
        }
        BigDecimal diff = existing.subtract(computed).abs();
        return diff.compareTo(BigDecimal.valueOf(0.5)) > 0;
    }

    /**
     * List services for the current tenant. Supports pagination, sorting and
     * keyword search. By default results are sorted by creation time in
     * descending order. Pass a non‑blank {@code q} parameter to search by
     * buyer/consignee name, GSTIN or contact.
     *
     * @param page   zero‑based page index (defaults to 0)
     * @param size   page size (defaults to 20)
     * @param sort   comma‑separated sort field and direction (e.g. "createdAt,desc")
     * @param q      optional search keyword
     * @return a page of services belonging to the current tenant
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE')")
    public ResponseEntity<org.springframework.data.domain.Page<Service>> listServices(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(name = "sort", defaultValue = "createdAt,desc") String sort,
            @RequestParam(name = "q", required = false) String q
    ) {
        Long tenantId = TenantContext.getTenantId();
        // Parse sort parameter into Sort instance. Format: "field,direction".
        org.springframework.data.domain.Sort sortSpec;
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            String field = parts.length > 0 ? parts[0] : "createdAt";
            String dir = parts.length > 1 ? parts[1] : "desc";
            sortSpec = "asc".equalsIgnoreCase(dir)
                    ? org.springframework.data.domain.Sort.by(field).ascending()
                    : org.springframework.data.domain.Sort.by(field).descending();
        } else {
            sortSpec = org.springframework.data.domain.Sort.by("createdAt").descending();
        }
        // Constrain page size to a sensible maximum to prevent excessive loads.
        int pageSize = Math.max(1, Math.min(size, 100));
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, pageSize, sortSpec);
        org.springframework.data.domain.Page<Service> result;
        if (q != null && !q.isBlank()) {
            result = repository.searchByTenantIdAndKeyword(tenantId, q, pageable);
        } else {
            result = repository.findByTenantId(tenantId, pageable);
        }
        result.forEach(this::normaliseServicePayload);
        return ResponseEntity.ok(result);
    }

    /**
     * Retrieve the details of a single service by ID. Ensures the service
     * belongs to the current tenant. Returns a 404 response if the service
     * does not exist or belongs to a different tenant.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE')")
    public ResponseEntity<Map<String, Object>> getService(@PathVariable("id") Long id) {
        if (id == null) {
            return ResponseEntity.notFound().build();
        }
        java.util.Optional<Service> opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Service svc = opt.get();
        Long tenantId = TenantContext.getTenantId();
        if (svc.getTenantId() != null && !svc.getTenantId().equals(tenantId)) {
            // Do not leak existence of other tenants' data
            return ResponseEntity.notFound().build();
        }
        normaliseServicePayload(svc);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("service", svc);
        Map<String, Object> context = resolveServiceContext(tenantId, svc);
        response.putAll(context);
        return ResponseEntity.ok(response);
    }

    /**
     * Suggest buyer profiles for the autocomplete field on the service form. This
     * endpoint performs a keyword search across existing services and returns
     * basic buyer details such as name, GSTIN, address, pin, state and contact.
     * The number of results is capped by the {@code limit} parameter. Duplicates
     * are removed based on buyer name and contact to avoid spamming the UI.
     */
    @GetMapping("/autocomplete")
    @PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE')")
    public ResponseEntity<List<Map<String, Object>>> autocomplete(
            @RequestParam(name = "q") String q,
            @RequestParam(name = "limit", defaultValue = "5") int limit
    ) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        Long tenantId = TenantContext.getTenantId();
        int max = Math.max(1, Math.min(limit, 50));
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, max);
        org.springframework.data.domain.Page<Service> page = repository.searchByTenantIdAndKeyword(tenantId, q, pageable);
        List<Map<String, Object>> out = new ArrayList<>();
        java.util.Set<String> seenKeys = new java.util.HashSet<>();
        for (Service s : page.getContent()) {
            String key = (s.getBuyerName() != null ? s.getBuyerName().toLowerCase() : "") + "|"
                    + (s.getBuyerContact() != null ? s.getBuyerContact().toLowerCase() : "");
            if (seenKeys.contains(key)) continue;
            seenKeys.add(key);
            Map<String, Object> m = new HashMap<>();
            m.put("buyerName", s.getBuyerName());
            m.put("buyerGst", s.getBuyerGst());
            m.put("buyerAddress", s.getBuyerAddress());
            m.put("buyerPin", s.getBuyerPin());
            m.put("buyerState", s.getBuyerState());
            m.put("buyerContact", s.getBuyerContact());
            m.put("buyerEmail", s.getBuyerEmail());
            out.add(m);
            if (out.size() >= max) break;
        }
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> resolveServiceContext(Long tenantId, Service svc) {
        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, Object> meta = safeReadMap(svc.getMetaJson());

        Long workOrderId = coerceLong(meta.get("workOrderId"));
        if (workOrderId == null) {
            workOrderId = coerceLong(meta.get("woId"));
        }
        Long serviceRequestId = coerceLong(meta.get("serviceRequestId"));
        if (serviceRequestId == null) {
            serviceRequestId = coerceLong(meta.get("srId"));
        }
        Long proposalId = coerceLong(meta.get("proposalId"));
        if (proposalId == null) {
            proposalId = coerceLong(meta.get("proposalID"));
        }

        ServiceRequest sr = null;
        WorkOrder wo = null;

        if (workOrderId != null) {
            wo = workOrderRepo.findById(workOrderId)
                    .filter(w -> tenantId.equals(w.getTenantId()))
                    .orElse(null);
        }

        if (wo != null) {
            hydrateWorkOrderForContext(wo);
            sr = wo.getServiceRequest();
        }

        if (sr == null && serviceRequestId != null) {
            sr = serviceRequestRepo.findById(serviceRequestId)
                    .filter(req -> tenantId.equals(req.getTenantId()))
                    .orElse(null);
        }

        if (sr == null && proposalId != null) {
            sr = serviceRequestRepo.findFirstByTenantIdAndProposal_Id(tenantId, proposalId)
                    .orElse(null);
        }

        if (wo == null && sr != null) {
            java.util.List<WorkOrder> list = workOrderRepo.findByTenantIdAndServiceRequest_Id(tenantId, sr.getId());
            if (!list.isEmpty()) {
                list.sort((a, b) -> Long.compare(
                        b.getId() != null ? b.getId() : 0L,
                        a.getId() != null ? a.getId() : 0L));
                wo = list.get(0);
                hydrateWorkOrderForContext(wo);
            }
        }

        if (sr == null && wo != null) {
            sr = wo.getServiceRequest();
        }

        if (sr != null) {
            hydrateServiceRequestForContext(sr);
            out.put("serviceRequest", summariseServiceRequest(sr));
        } else {
            out.put("serviceRequest", null);
        }

        if (wo != null) {
            out.put("workOrder", summariseWorkOrder(wo));
            List<WorkOrderAssignment> assignments = workOrderAssignmentRepo
                    .findByTenantIdAndWorkOrder_IdOrderByAssignedAtDesc(tenantId, wo.getId());
            assignments.forEach(this::hydrateAssignmentForContext);
            out.put("assignments", summariseAssignments(assignments));
            List<WorkOrderProgress> progress = workOrderProgressRepo
                    .findByTenantIdAndWorkOrder_IdOrderByCreatedAtAsc(tenantId, wo.getId());
            progress.forEach(this::hydrateProgressForContext);
            Map<Long, List<WorkOrderProgressAttachment>> attachmentsByProgress = Map.of();
            List<Long> progressIds = progress.stream()
                    .map(WorkOrderProgress::getId)
                    .filter(idVal -> idVal != null)
                    .toList();
            if (!progressIds.isEmpty()) {
                attachmentsByProgress = progressAttachmentRepo
                        .findByTenantIdAndProgress_IdIn(tenantId, progressIds)
                        .stream()
                        .filter(att -> att.getProgress() != null && att.getProgress().getId() != null)
                        .collect(java.util.stream.Collectors.groupingBy(att -> att.getProgress().getId()));
            }
            out.put("progress", summariseProgress(progress, attachmentsByProgress, wo.getId()));
        } else {
            out.put("workOrder", null);
            out.put("assignments", java.util.Collections.emptyList());
            out.put("progress", java.util.Collections.emptyList());
        }

        return out;
    }

    private void hydrateWorkOrderForContext(WorkOrder wo) {
        if (wo == null) return;
        if (wo.getServiceRequest() != null) {
            wo.getServiceRequest().getId();
            if (wo.getServiceRequest().getCustomer() != null) {
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
            wo.getCustomerPO().getPoNumber();
            wo.getCustomerPO().getFileUrl();
            wo.getCustomerPO().getUploadedAt();
        }
    }

    private void hydrateServiceRequestForContext(ServiceRequest sr) {
        if (sr == null) return;
        sr.getSrn();
        sr.getServiceType();
        sr.getDescription();
        sr.getSiteAddress();
        if (sr.getCustomer() != null) {
            sr.getCustomer().getName();
            sr.getCustomer().getEmail();
            sr.getCustomer().getMobile();
            sr.getCustomer().getAddress();
        }
    }

    private void hydrateAssignmentForContext(WorkOrderAssignment a) {
        if (a == null) return;
        if (a.getFieldEngineer() != null) {
            a.getFieldEngineer().getId();
            if (a.getFieldEngineer().getUser() != null) {
                a.getFieldEngineer().getUser().getDisplayName();
            }
        }
        if (a.getTeam() != null) {
            a.getTeam().getId();
            a.getTeam().getName();
        }
    }

    private void hydrateProgressForContext(WorkOrderProgress p) {
        if (p == null) return;
        p.getStatus();
        if (p.getByFE() != null) {
            p.getByFE().getId();
            if (p.getByFE().getUser() != null) {
                p.getByFE().getUser().getDisplayName();
            }
        }
    }

    private Map<String, Object> summariseWorkOrder(WorkOrder wo) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", wo.getId());
        map.put("wan", wo.getWan());
        map.put("status", wo.getStatus() != null ? wo.getStatus().name() : null);
        map.put("startDate", wo.getStartDate());
        map.put("dueDate", wo.getDueDate());
        if (wo.getAssignedFE() != null) {
            Map<String, Object> fe = new LinkedHashMap<>();
            fe.put("id", wo.getAssignedFE().getId());
            String name = wo.getAssignedFE().getUser() != null
                    ? wo.getAssignedFE().getUser().getDisplayName()
                    : wo.getAssignedFE().getName();
            fe.put("name", name);
            map.put("assignedFE", fe);
        }
        if (wo.getAssignedTeam() != null) {
            Map<String, Object> team = new LinkedHashMap<>();
            team.put("id", wo.getAssignedTeam().getId());
            team.put("name", wo.getAssignedTeam().getName());
            map.put("assignedTeam", team);
        }
        if (wo.getCustomerPO() != null) {
            Map<String, Object> po = new LinkedHashMap<>();
            po.put("id", wo.getCustomerPO().getId());
            po.put("poNumber", wo.getCustomerPO().getPoNumber());
            po.put("fileUrl", wo.getCustomerPO().getFileUrl());
            po.put("uploadedAt", wo.getCustomerPO().getUploadedAt());
            map.put("customerPO", po);
        }
        return map;
    }

    private Map<String, Object> summariseServiceRequest(ServiceRequest sr) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", sr.getId());
        map.put("srn", sr.getSrn());
        map.put("serviceType", sr.getServiceType() != null ? sr.getServiceType().name() : null);
        map.put("description", sr.getDescription());
        map.put("siteAddress", sr.getSiteAddress());
        map.put("createdAt", sr.getCreatedAt());
        if (sr.getCustomer() != null) {
            Map<String, Object> customer = new LinkedHashMap<>();
            customer.put("id", sr.getCustomer().getId());
            customer.put("name", sr.getCustomer().getName());
            customer.put("email", sr.getCustomer().getEmail());
            customer.put("mobile", sr.getCustomer().getMobile());
            customer.put("address", sr.getCustomer().getAddress());
            map.put("customer", customer);
        }
        return map;
    }

    private List<Map<String, Object>> summariseAssignments(List<WorkOrderAssignment> assignments) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (WorkOrderAssignment a : assignments) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", a.getId());
            map.put("assignedAt", a.getAssignedAt());
            map.put("note", a.getNote());
            if (a.getFieldEngineer() != null) {
                Map<String, Object> fe = new LinkedHashMap<>();
                fe.put("id", a.getFieldEngineer().getId());
                String name = a.getFieldEngineer().getUser() != null
                        ? a.getFieldEngineer().getUser().getDisplayName()
                        : a.getFieldEngineer().getName();
                fe.put("name", name);
                map.put("fieldEngineer", fe);
            }
            if (a.getTeam() != null) {
                Map<String, Object> team = new LinkedHashMap<>();
                team.put("id", a.getTeam().getId());
                team.put("name", a.getTeam().getName());
                map.put("team", team);
            }
            list.add(map);
        }
        return list;
    }

    private List<Map<String, Object>> summariseProgress(List<WorkOrderProgress> progress,
                                                        Map<Long, List<WorkOrderProgressAttachment>> attachmentsByProgress,
                                                        Long woId) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (WorkOrderProgress p : progress) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", p.getId());
            map.put("status", p.getStatus() != null ? p.getStatus().name() : null);
            map.put("remarks", p.getRemarks());
            map.put("photoUrl", p.getPhotoUrl());
            map.put("createdAt", p.getCreatedAt());
            if (p.getByFE() != null) {
                Map<String, Object> fe = new LinkedHashMap<>();
                fe.put("id", p.getByFE().getId());
                String name = p.getByFE().getUser() != null
                        ? p.getByFE().getUser().getDisplayName()
                        : p.getByFE().getName();
                fe.put("name", name);
                map.put("byFE", fe);
            }
            Long progressId = p.getId();
            List<Map<String, Object>> attachmentViews = attachmentsByProgress
                    .getOrDefault(progressId, java.util.Collections.emptyList())
                    .stream()
                    .map(att -> {
                        Map<String, Object> attMap = new LinkedHashMap<>();
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
                    .toList();
            map.put("attachments", attachmentViews);
            list.add(map);
        }
        return list;
    }

    private Long coerceLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) {
            return n.longValue();
        }
        if (value instanceof String s) {
            String trimmed = s.trim();
            if (trimmed.isEmpty()) return null;
            try {
                return Long.parseLong(trimmed);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
    /**
     * Create a new service. Expects a JSON body with the following
     * structure:
     * {
     *   "buyer": { ... },
     *   "consignee": { ... },
     *   "meta": { ... },
     *   "items": [ ... ],
     *   "totals": { ... }
     * }
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE')")
    public ResponseEntity<Service> createService(@Valid @RequestBody Map<String, Object> payload) throws JsonProcessingException {
        Map<String, Object> buyer = toMap(payload.get("buyer"));
        Map<String, Object> consignee = toMap(payload.get("consignee"));
        Object items = payload.get("items");
        Map<String, Object> meta = toMap(payload.get("meta"));
        Object totals = payload.get("totals");

        Long tenantId = TenantContext.getTenantId();

        // Normalise frequently used meta fields up-front so that both the
        // persisted JSON and the downstream PDF generation have cleaned
        // document numbers without stray hash prefixes.
        String invoiceNo = sanitizeDocCode(meta.get("invoiceNo"));
        String proformaNo = sanitizeDocCode(meta.get("pinvNo"));
        java.time.LocalDate invoiceDateRef = parseIsoDate(meta.get("invoiceDate"));
        java.time.LocalDate proformaDateRef = parseIsoDate(meta.get("pinvDate"));
        if (tenantId != null) {
            java.time.LocalDate today = java.time.LocalDate.now();
            if (invoiceNo.isEmpty()) {
                java.time.LocalDate target = invoiceDateRef != null ? invoiceDateRef : today;
                invoiceNo = sequenceService.nextNumber(tenantId, DocumentSequence.Scope.INVOICE, target, "INV-", 3);
            }
            if (proformaNo.isEmpty()) {
                java.time.LocalDate target = proformaDateRef != null ? proformaDateRef : today;
                proformaNo = sequenceService.nextNumber(tenantId, DocumentSequence.Scope.PROFORMA, target, "PINV-", 3);
            }
        }
        if (!invoiceNo.isEmpty()) {
            meta.put("invoiceNo", invoiceNo);
        }
        if (!proformaNo.isEmpty()) {
            meta.put("pinvNo", proformaNo);
        }

        // Extract canonical buyer fields:
        String buyerName    = stringOrNull(buyer.get("name"));
        String buyerGst     = stringOrNull(buyer.get("gst"));
        String buyerContact = stringOrNull(buyer.get("contact"));
        String buyerEmail   = stringOrNull(buyer.get("email"));
        Service svc = new Service();
        if (tenantId != null) svc.setTenantId(tenantId);
        // Set buyer fields
        svc.setBuyerName(buyerName);
        svc.setBuyerGst(buyerGst);
        svc.setBuyerContact(buyerContact);
        svc.setBuyerEmail(buyerEmail);
        svc.setBuyerAddress((String) buyer.getOrDefault("address", null));
        svc.setBuyerPin((String) buyer.getOrDefault("pin", null));
        svc.setBuyerState((String) buyer.getOrDefault("state", null));
        // Extract optional contact number/email
        // Set consignee fields
        svc.setConsigneeName((String) consignee.getOrDefault("name", null));
        svc.setConsigneeGst((String) consignee.getOrDefault("gst", null));
        svc.setConsigneeAddress((String) consignee.getOrDefault("address", null));
        svc.setConsigneePin((String) consignee.getOrDefault("pin", null));
        svc.setConsigneeState((String) consignee.getOrDefault("state", null));
        // Serialise arbitrary payload sections
        svc.setItemsJson(items != null ? objectMapper.writeValueAsString(items) : null);
        svc.setMetaJson(!meta.isEmpty() ? objectMapper.writeValueAsString(meta) : null);
        svc.setTotalsJson(totals != null ? objectMapper.writeValueAsString(totals) : null);
        Service saved = repository.save(svc);

        // Attempt to automatically create a draft proposal when a service is created.
        // We wrap this in a try/catch to avoid interfering with the primary
        // service creation flow should any errors occur. The proposal uses the
        // buyer information to create or look up a customer record.
        try {
            Long currentTenantId = saved.getTenantId();
            // Derive or create a customer based on buyer name and contact. Email
            // addresses are stored under the "email" key on the buyer map, but
            // our front‑end uses "contact" for phone numbers. We look up by
            // mobile first, then by email, and finally by name.
            String lookupEmail   = buyerEmail;
            String lookupMobile  = buyerContact;
            String lookupName    = buyerName;
            var customer = (lookupEmail != null)
                    ? customerRepo.findByTenantIdAndEmailIgnoreCase(currentTenantId, lookupEmail).orElse(null)
                    : null;
            if (customer == null && lookupMobile != null) {
                customer = customerRepo.findByTenantIdAndMobile(currentTenantId, lookupMobile).orElse(null);
            }
            if (customer == null && lookupName != null) {
                var possibles = customerRepo.findByTenantIdAndNameContainingIgnoreCase(currentTenantId, lookupName);
                customer = possibles.isEmpty() ? null : possibles.get(0);
            }
            if (customer == null) {
                customer = new Customer();
                customer.setTenantId(currentTenantId);
                customer.setName(lookupName);
                customer.setEmail(lookupEmail);
                customer.setMobile(lookupMobile);
                customerRepo.save(customer);
            }
            // Derive service type from meta json (if present). Default to SUPPLY.
            com.vebops.domain.enums.ServiceTypeCode svcType = parseServiceType(meta);
            // Derive pricing totals from totals map (subtotal, tax, total)
            java.math.BigDecimal subtotal = null, taxAmt = null, totalAmt = null;
            if (totals instanceof Map<?, ?>) {
                Object sub = ((Map<?, ?>) totals).get("subtotal");
                Object taxVal = ((Map<?, ?>) totals).get("tax");
                Object tot = ((Map<?, ?>) totals).get("total");
                try { if (sub != null) subtotal = new java.math.BigDecimal(sub.toString()); } catch (Exception ignored) {}
                try { if (taxVal != null) taxAmt = new java.math.BigDecimal(taxVal.toString()); } catch (Exception ignored) {}
                try { if (tot != null) totalAmt = new java.math.BigDecimal(tot.toString()); } catch (Exception ignored) {}
            }
            // Create and persist the proposal
            com.vebops.domain.Proposal prop = new com.vebops.domain.Proposal();
            prop.setTenantId(currentTenantId);
            prop.setCustomer(customer);
            prop.setServiceType(svcType);
            prop.setSubtotal(subtotal);
            prop.setTax(taxAmt);
            prop.setTotal(totalAmt);
            prop.setStatus(com.vebops.domain.enums.ProposalStatus.DRAFT);
            proposalRepo.save(prop);

            // Persist the generated proposal id back into the service meta so
            // follow-up workflows (sharing to customer portal, proposal history)
            // can resolve the relationship without fuzzy matching.
            meta.put("proposalId", prop.getId());
            saved.setMetaJson(objectMapper.writeValueAsString(meta));
            saved = repository.save(saved);
        } catch (Exception ignored) {
            // Suppress any exceptions here; the primary service creation should
            // still succeed even if proposal creation fails. Consider logging in
            // a real application.
        }

        // Attempt to generate and attach a PDF invoice for the new service. This
        // PDF is stored as a Document with entity type SR so that it can be
        // downloaded and emailed later. Any errors here should be suppressed
        // to avoid affecting the core service creation flow.
        try {
            Long tid = saved.getTenantId();
            // Parse JSON blobs using the injected ObjectMapper
            java.util.List<java.util.Map<String, Object>> itemsList = java.util.Collections.emptyList();
            java.util.Map<String, Object> metaMap = java.util.Collections.emptyMap();
            java.util.Map<String, Object> totalsMap = java.util.Collections.emptyMap();
            // Parse JSON blobs into strongly typed structures using Jackson. When
            // conversion fails, fall back to empty collections to avoid NPEs.
            try {
                if (items != null) {
                    // Convert items (which may be a List or raw JSON) into a list of maps
                    itemsList = objectMapper.convertValue(
                            items,
                            new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String, Object>>>() {}
                    );
                }
            } catch (Exception ignored3) {
                itemsList = java.util.Collections.emptyList();
            }
            try {
                if (meta != null) {
                    metaMap = objectMapper.convertValue(
                            meta,
                            new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {}
                    );
                }
            } catch (Exception ignored4) {
                metaMap = java.util.Collections.emptyMap();
            }
            try {
                if (totals != null) {
                    totalsMap = objectMapper.convertValue(
                            totals,
                            new com.fasterxml.jackson.core.type.TypeReference<java.util.Map<String, Object>>() {}
                    );
                }
            } catch (Exception ignored5) {
                totalsMap = java.util.Collections.emptyMap();
            }
            // Fetch company details for header (optional)
            com.vebops.domain.CompanyDetails company = companyRepo.findByTenantId(tid).orElse(null);
            // Ensure we have a mutable meta map so we can stamp the desired document type.
            metaMap = new java.util.LinkedHashMap<>(metaMap);
            String rawDocType = String.valueOf(metaMap.getOrDefault("docType", "INVOICE")).trim().toUpperCase();
            boolean proforma = "PROFORMA".equals(rawDocType) || "PINV".equals(rawDocType);
            metaMap.put("docType", proforma ? "PROFORMA" : "INVOICE");
            // Build PDF using the in-app renderer. When successfully generated, persist the
            // PDF on disk and record a Document entity with a reference to the stored file
            // instead of embedding the base64 content in the database.
            byte[] pdfBytes = com.vebops.util.PdfUtil.buildServiceInvoicePdf(saved, metaMap, itemsList, totalsMap, company);
            if (pdfBytes != null && pdfBytes.length > 0) {
                // Create a new Document entry and persist it to obtain an ID.
                com.vebops.domain.Document doc = new com.vebops.domain.Document();
                doc.setTenantId(tid);
                doc.setKind(com.vebops.domain.enums.DocumentKind.PDF);
                doc.setEntityType(proforma
                        ? com.vebops.domain.enums.DocumentEntityType.PROFORMA
                        : com.vebops.domain.enums.DocumentEntityType.INVOICE);
                doc.setEntityId(saved.getId());
                String baseFilename = computeFileName(metaMap, saved.getId(), proforma) + ".pdf";
                doc.setFilename(baseFilename);
                // Persist document to get an ID
                doc = documentRepo.save(doc);
                try {
                    // Save the PDF to the filesystem.  The returned name is sanitised.
                    String storedName = fileStorage.saveServiceInvoiceDoc(tid, saved.getId(), doc.getId(), baseFilename, pdfBytes);
                    // Store the on‑disk filename in the url field.  We avoid the base64 data URI
                    // to keep the database lean.
                    doc.setUrl(storedName);
                    documentRepo.save(doc);
                } catch (Exception storageEx) {
                    // If file storage fails, remove the partially persisted doc to avoid
                    // dangling records.  Alternatively we could fall back to base64 storage.
                    try { documentRepo.deleteById(doc.getId()); } catch (Exception ignored6) {}
                }
            }
        } catch (Exception ignored) {
            // swallow any exceptions; PDF generation failures should not block service creation
        }

        return ResponseEntity.ok(saved);
    }

    /**
     * Normalises a serviceType value from the payload into the ServiceTypeCode enum.
     * Accepts user-friendly names (e.g. "Installation only", "Supply with installation")
     * by mapping them to existing enum constants. Unknown values fall back to SUPPLY.
     */
    private com.vebops.domain.enums.ServiceTypeCode parseServiceType(Object metaObj) {
        if (metaObj instanceof java.util.Map<?,?> m) {
            Object st = m.get("serviceType");
            if (st != null) {
                String raw = st.toString().trim();
                if (!raw.isBlank()) {
                    String key = raw.toUpperCase().replace('-', '_').replace(' ', '_');
                    // Map friendly names to enums
                    switch (key) {
                        case "INSTALLATION_ONLY" -> { return com.vebops.domain.enums.ServiceTypeCode.INSTALL_ONLY; }
                        case "INSTALL_ONLY" -> { return com.vebops.domain.enums.ServiceTypeCode.INSTALL_ONLY; }
                        case "SUPPLY_ONLY", "SUPPLY" -> { return com.vebops.domain.enums.ServiceTypeCode.SUPPLY; }
                        case "SUPPLY_WITH_INSTALLATION", "SUPPLY_INSTALL", "SUPPLY_WITH_INSTALL" -> { return com.vebops.domain.enums.ServiceTypeCode.SUPPLY_INSTALL; }
                        case "ERECTION", "CABLE_FAULT_IDENTIFICATION", "CABLE_FAULT", "HIPOT_TESTING", "FAULT_IDENTIFICATION" -> { return com.vebops.domain.enums.ServiceTypeCode.ERECTION; }
                        default -> {
                            try { return com.vebops.domain.enums.ServiceTypeCode.valueOf(key); } catch (Exception ignored) {}
                        }
                    }
                }
            }
        }
        return com.vebops.domain.enums.ServiceTypeCode.SUPPLY;
    }

    /**
     * Download the stored invoice PDF for a service. Looks up a Document of
     * type PDF attached to the service (entityType SR) and returns the binary
     * content. Responds with 404 if no invoice is stored. The Content-Disposition
     * header forces a download in the browser with the stored filename.
     */
    // ---------- DOWNLOAD: /office/services/{id}/invoice ----------
    @GetMapping(value="/{id}/invoice", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE','ADMIN')") // include ADMIN if needed
    public ResponseEntity<byte[]> downloadServiceInvoice(@PathVariable("id") Long id,
                                                         @RequestParam(name = "type", required = false) String type) {
        Long tid = com.vebops.context.TenantContext.getTenantId();
        boolean proforma = type != null && !type.isBlank() && (
                "PROFORMA".equalsIgnoreCase(type) || "PINV".equalsIgnoreCase(type));
        var doc = ensureServiceInvoiceDoc(tid, id, proforma);
        if (doc == null) return ResponseEntity.notFound().build();
        // Load the stored bytes from disk or decode base64
        byte[] bytes = loadDocumentBytes(doc);
        if (bytes == null || bytes.length == 0) return ResponseEntity.notFound().build();

        String fallback = proforma ? "service-" + id + "-proforma.pdf" : "service-" + id + ".pdf";
        String fname = (doc.getFilename() == null || doc.getFilename().isBlank()) ? fallback : doc.getFilename();
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fname.replace("\"", "") + "\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(bytes);
    }

    /**
     * Send the stored invoice PDF for a service via email or WhatsApp. Accepts
     * JSON body with either "toEmail" or "toWhatsapp" (at least one). If a
     * stored invoice is found it is decoded and attached to the outgoing
     * message. Uses JavaMailSender directly to attach the PDF. A log entry
     * is recorded via EmailService for audit. When WhatsApp is specified the
     * PDF is sent via emailService only (real WhatsApp integration is not
     * implemented). Returns 200 on success or 404 if no invoice exists.
     */
    @PostMapping("/{id}/invoice/send")
    @PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE','ADMIN')") // include ADMIN if needed
    public ResponseEntity<Void> sendServiceInvoice(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String,Object> body,
            @RequestParam(name = "type", required = false) String type) {
        Long tid = com.vebops.context.TenantContext.getTenantId();
        String toEmail = body == null ? null : String.valueOf(body.getOrDefault("toEmail","")).trim();
        String toWhatsapp = body == null ? null : String.valueOf(body.getOrDefault("toWhatsapp","")).trim();

        boolean proforma = type != null && !type.isBlank() && (
                "PROFORMA".equalsIgnoreCase(type) || "PINV".equalsIgnoreCase(type));

        var doc = ensureServiceInvoiceDoc(tid, id, proforma);
        if (doc == null) return ResponseEntity.notFound().build();

        // Load the stored PDF contents
        byte[] bytes = loadDocumentBytes(doc);
        if (bytes == null || bytes.length == 0) return ResponseEntity.notFound().build();

        String fallback = proforma ? "service-" + id + "-proforma.pdf" : "service-" + id + ".pdf";
        String filename = (doc.getFilename() == null || doc.getFilename().isBlank()) ? fallback : doc.getFilename();
        String subjectLabel = proforma ? "Proforma Invoice" : "Invoice";
        String emailBody = "Please find attached " + subjectLabel.toLowerCase() + ".";

        // Email (if provided)
        if (toEmail != null && !toEmail.isBlank() && mailSender != null) {
            try {
                var message = mailSender.createMimeMessage();
                var helper = new org.springframework.mail.javamail.MimeMessageHelper(message, true);
                helper.setTo(toEmail);
                helper.setSubject(subjectLabel + " for Service " + id);
                helper.setText(emailBody);
                helper.addAttachment(filename, new org.springframework.core.io.ByteArrayResource(bytes));
                mailSender.send(message);
            } catch (Exception ignored) {}
            try {
                emailService.send(tid, toEmail, subjectLabel + " for Service " + id, emailBody,
                        proforma ? "PROFORMA" : "INVOICE", id, false);
            } catch (Exception ignored) {}
        }

        // WhatsApp placeholder: log via emailService (real WA integration isn’t wired here)
        if (toWhatsapp != null && !toWhatsapp.isBlank()) {
            try {
                emailService.send(tid, toWhatsapp, subjectLabel + " for Service " + id, emailBody,
                        proforma ? "PROFORMA" : "INVOICE", id, false);
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok().build();
    }


    /**
     * Attach the generated service invoice (or proforma invoice) to the related
     * proposal so that it becomes visible in the customer portal. The method
     * stores the PDF under the proposal document bucket, marks the proposal as
     * SENT when it was previously a draft, and persists the proposal id back on
     * the service metadata for future lookups.
     */
    @PostMapping("/{id}/proposal/share")
    @PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE','ADMIN')")
    public ResponseEntity<Map<String, Object>> shareServiceProposal(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        Long tid = TenantContext.getTenantId();
        Optional<Service> svcOpt = repository.findById(id);
        if (svcOpt.isEmpty() || !java.util.Objects.equals(svcOpt.get().getTenantId(), tid)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        Service svc = svcOpt.get();

        Map<String, Object> meta = new LinkedHashMap<>(readMap(svc.getMetaJson()));
        String requestedDocType = body != null
                ? String.valueOf(body.getOrDefault("docType", "PROFORMA"))
                : "PROFORMA";
        boolean proforma = requestedDocType == null || requestedDocType.isBlank()
                || "PROFORMA".equalsIgnoreCase(requestedDocType)
                || "PINV".equalsIgnoreCase(requestedDocType);

        Long proposalId = null;
        Object rawProposalId = meta.get("proposalId");
        if (rawProposalId instanceof Number) {
            proposalId = ((Number) rawProposalId).longValue();
        } else if (rawProposalId instanceof String s && !s.isBlank()) {
            try { proposalId = Long.parseLong(s.trim()); } catch (NumberFormatException ignored) {}
        }

        Proposal proposal = null;
        if (proposalId != null) {
            proposal = proposalRepo.findByTenantIdAndId(tid, proposalId).orElse(null);
        }

        if (proposal == null) {
            // Attempt to resolve by matching customer details from the service record.
            String lookupEmail = stringOrNull(svc.getBuyerEmail());
            String lookupMobile = stringOrNull(svc.getBuyerContact());
            String lookupName = stringOrNull(svc.getBuyerName());
            Customer customer = null;
            if (lookupEmail != null) {
                customer = customerRepo.findByTenantIdAndEmailIgnoreCase(tid, lookupEmail).orElse(null);
            }
            if (customer == null && lookupMobile != null) {
                customer = customerRepo.findByTenantIdAndMobile(tid, lookupMobile).orElse(null);
            }
            if (customer == null && lookupName != null) {
                var possibles = customerRepo.findByTenantIdAndNameContainingIgnoreCase(tid, lookupName);
                customer = possibles.isEmpty() ? null : possibles.get(0);
            }
            if (customer != null) {
                proposal = proposalRepo.findTopByTenantIdAndCustomer_IdOrderByCreatedAtDesc(tid, customer.getId()).orElse(null);
            }
        }

        if (proposal == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "No related proposal found for this service"));
        }

        // Ensure proposal id is recorded on service meta for future lookups
        meta.put("proposalId", proposal.getId());
        try {
            svc.setMetaJson(objectMapper.writeValueAsString(meta));
            repository.save(svc);
        } catch (Exception ignored) {}

        Document invoiceDoc = ensureServiceInvoiceDoc(tid, id, proforma);
        if (invoiceDoc == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Invoice PDF not available for this service"));
        }
        byte[] pdf = loadDocumentBytes(invoiceDoc);
        if (pdf == null || pdf.length == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Stored PDF could not be read"));
        }

        Document doc = new Document();
        doc.setTenantId(tid);
        doc.setEntityType(DocumentEntityType.PROPOSAL);
        doc.setEntityId(proposal.getId());
        doc.setKind(DocumentKind.PDF);
        doc.setUploadedAt(Instant.now());
        doc = documentRepo.saveAndFlush(doc);

        String baseName = computeFileName(meta, id, proforma);
        if (baseName == null || baseName.isBlank()) {
            baseName = proforma ? ("proposal-" + proposal.getId() + "-proforma") : ("proposal-" + proposal.getId());
        } else if (!baseName.toLowerCase().contains("proposal")) {
            baseName = baseName + (proforma ? "-proforma" : "-proposal");
        }
        String fname = baseName + ".pdf";
        try {
            String stored = fileStorage.saveProposalDoc(tid, proposal.getId(), doc.getId(), fname, pdf);
            doc.setFilename(stored);
        } catch (Exception e) {
            documentRepo.delete(doc);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to store proposal PDF"));
        }

        doc.setUrl(String.format("/customer/proposals/%d/documents/%d/download", proposal.getId(), doc.getId()));
        doc = documentRepo.save(doc);

        if (proposal.getStatus() == ProposalStatus.DRAFT || proposal.getStatus() == ProposalStatus.REJECTED) {
            proposal.setStatus(ProposalStatus.SENT);
        }
        proposalRepo.save(proposal);

        Map<String, Object> response = new HashMap<>();
        response.put("proposalId", proposal.getId());
        response.put("documentId", doc.getId());
        response.put("status", proposal.getStatus().name());
        response.put("filename", doc.getFilename());
        response.put("docType", proforma ? "PROFORMA" : "INVOICE");
        return ResponseEntity.ok(response);
    }


    // ---- Helper: decode a data: URL into bytes ----
    /**
     * Load the binary contents of a stored Document.  Documents may store
     * either a base64‑encoded data URI (legacy behaviour) or a filename
     * referencing a PDF on disk.  When the url begins with the data URI
     * prefix the base64 portion is decoded.  Otherwise the file is loaded
     * from the file system using the FileStorageService.  If the file
     * cannot be found or decoded, {@code null} is returned.
     *
     * @param doc the Document to load
     * @return a byte array containing the PDF content or {@code null} on failure
     */
    private byte[] loadDocumentBytes(com.vebops.domain.Document doc) {
        if (doc == null) return null;
        String url = doc.getUrl();
        if (url == null) return null;
        // Legacy base64 encoded data URL
        String prefix = "data:application/pdf;base64,";
        if (url.startsWith(prefix)) {
            try {
                return Base64.getDecoder().decode(url.substring(prefix.length()));
            } catch (Exception e) {
                return null;
            }
        }
        // Otherwise treat url as an on‑disk filename
        try {
            Long tid = com.vebops.context.TenantContext.getTenantId();
            Long serviceId = doc.getEntityId();
            Long docId = doc.getId();
            java.io.File f = fileStorage.loadServiceInvoiceDoc(tid, serviceId, docId, url);
            if (f != null && f.exists()) {
                return java.nio.file.Files.readAllBytes(f.toPath());
            }
        } catch (Exception e) {
            // fall through and return null
        }
        return null;
    }

    // ---- Helper: parse JSON safely ----
    private Map<String,Object> readMap(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<Map<String,Object>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }
    private List<Map<String,Object>> readList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<Map<String,Object>>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
    // ---- Helper: compute filename from meta ----
    private String sanitizeDocCode(Object value) {
        if (value == null) return "";
        String code = String.valueOf(value).trim();
        if (code.isEmpty()) return "";
        while (code.startsWith("#")) {
            code = code.substring(1).trim();
        }
        return code;
    }
    private java.time.LocalDate parseIsoDate(Object value) {
        if (value == null) return null;
        if (value instanceof java.time.LocalDate ld) {
            return ld;
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return java.time.LocalDate.parse(text);
        } catch (Exception ignored) {
            return null;
        }
    }
    private String computeFileName(Map<String,Object> meta, Long id, boolean proforma) {
        String inv = sanitizeDocCode(meta.get("invoiceNo"));
        String pinv = sanitizeDocCode(meta.get("pinvNo"));
        String base;
        if (proforma) {
            base = !pinv.isEmpty() ? pinv : (!inv.isEmpty() ? inv : "service-" + id + "-proforma");
        } else {
            base = !inv.isEmpty() ? inv : (!pinv.isEmpty() ? pinv : "service-" + id);
        }
        if (base == null || base.isBlank()) {
            return proforma ? ("service-" + id + "-proforma") : ("service-" + id);
        }
        return base;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toMap(Object source) {
        if (source instanceof Map<?,?> raw) {
            Map<String, Object> copy = new LinkedHashMap<>();
            raw.forEach((k, v) -> copy.put(String.valueOf(k), v));
            return copy;
        }
        return new LinkedHashMap<>();
    }
    // ---- Helper: ensure there is a Document; generate+save if missing ----
    private com.vebops.domain.Document ensureServiceInvoiceDoc(Long tid, Long id, boolean proforma) {
        List<com.vebops.domain.Document> docs;
        if (proforma) {
            docs = documentRepo.findByEntityTypeAndEntityIdAndTenantId(DocumentEntityType.PROFORMA, id, tid);
            if (docs == null || docs.isEmpty()) {
                docs = documentRepo.findByEntityTypeAndEntityIdAndTenantId(DocumentEntityType.SR, id, tid);
            }
        } else {
            docs = documentRepo.findByEntityTypeAndEntityIdAndTenantId(DocumentEntityType.INVOICE, id, tid);
            if (docs == null || docs.isEmpty()) {
                docs = documentRepo.findByEntityTypeAndEntityIdAndTenantId(DocumentEntityType.SR, id, tid);
            }
        }
        Document doc = (docs != null && !docs.isEmpty()) ? docs.get(0) : null;

        DocumentEntityType desiredType = proforma ? DocumentEntityType.PROFORMA : DocumentEntityType.INVOICE;

        if (doc != null && doc.getEntityType() == desiredType) {
            byte[] existing = loadDocumentBytes(doc);
            if (existing != null && existing.length > 0) {
                return doc;
            }
        }

        var svcOpt = repository.findById(id);
        if (svcOpt.isEmpty() || !java.util.Objects.equals(svcOpt.get().getTenantId(), tid)) {
            return null; // not found / wrong tenant
        }
        var svc = svcOpt.get();

        Map<String,Object> meta   = new LinkedHashMap<>(readMap(svc.getMetaJson()));
        List<Map<String,Object>> items  = readList(svc.getItemsJson());
        Map<String,Object> totals = readMap(svc.getTotalsJson());
        var company = companyRepo.findByTenantId(tid).orElse(null);

        // Ensure docType flag is embedded so downstream renders respect the
        // requested document flavour (invoice vs proforma).
        meta.put("docType", proforma ? "PROFORMA" : "INVOICE");

        // Generate PDF from your HTML-based builder (already present in PdfUtil)
        byte[] pdf = com.vebops.util.PdfUtil.buildServiceInvoicePdf(svc, meta, items, totals, company);
        if (pdf == null || pdf.length == 0) return null;

        if (doc == null) {
            doc = new Document();
            doc.setTenantId(tid);
            doc.setEntityId(id);
            doc.setKind(DocumentKind.PDF);
        }
        doc.setEntityType(desiredType);
        doc.setUploadedAt(Instant.now());
        // Determine a filename from meta (invoiceNo or PINV/PINV etc.)
        String fname = computeFileName(meta, id, proforma) + ".pdf";
        doc.setFilename(fname);
        doc.setUrl(null);
        // Persist doc to obtain ID if needed
        doc = documentRepo.save(doc);
        try {
            // Persist PDF to storage and record filename in url
            String storedName = fileStorage.saveServiceInvoiceDoc(tid, id, doc.getId(), fname, pdf);
            doc.setUrl(storedName);
        } catch (Exception e) {
            // If storage fails, we fall back to base64 to avoid losing the invoice
            String base64 = Base64.getEncoder().encodeToString(pdf);
            doc.setUrl("data:application/pdf;base64," + base64);
        }
        return documentRepo.save(doc);
    }

    private static String stringOrNull(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isBlank() ? null : s;
    }

}