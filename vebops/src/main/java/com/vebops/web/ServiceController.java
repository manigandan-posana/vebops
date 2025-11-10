package com.vebops.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vebops.context.TenantContext;
import com.vebops.domain.Customer;
import com.vebops.domain.Document;
import com.vebops.domain.Proposal;
import com.vebops.domain.Service;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.domain.enums.ProposalStatus;
import com.vebops.repository.ServiceRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Base64;
import java.util.List;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.Optional;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
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

    private final ServiceRepository repository;
    private final ObjectMapper objectMapper;
    private final com.vebops.repository.CustomerRepository customerRepo;
    private final com.vebops.repository.ProposalRepository proposalRepo;

    private final com.vebops.repository.DocumentRepository documentRepo;
    private final com.vebops.repository.CompanyDetailsRepository companyRepo;
    private final org.springframework.mail.javamail.JavaMailSender mailSender;
    private final com.vebops.service.EmailService emailService;

    // Storage for persisting generated invoice PDFs.  Files are stored on
    // disk rather than encoded into the database.  Injected via the
    // constructor.
    private final FileStorageService fileStorage;

    public ServiceController(ServiceRepository repository,
                             ObjectMapper objectMapper,
                             com.vebops.repository.CustomerRepository customerRepo,
                             com.vebops.repository.ProposalRepository proposalRepo,
                             com.vebops.repository.DocumentRepository documentRepo,
                             com.vebops.repository.CompanyDetailsRepository companyRepo,
                             org.springframework.mail.javamail.JavaMailSender mailSender,
                             com.vebops.service.EmailService emailService,
                             FileStorageService fileStorage) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.customerRepo = customerRepo;
        this.proposalRepo = proposalRepo;
        this.documentRepo = documentRepo;
        this.companyRepo = companyRepo;
        this.mailSender = mailSender;
        this.emailService = emailService;
        this.fileStorage = fileStorage;
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
        return ResponseEntity.ok(result);
    }

    /**
     * Retrieve the details of a single service by ID. Ensures the service
     * belongs to the current tenant. Returns a 404 response if the service
     * does not exist or belongs to a different tenant.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('OFFICE','BACK_OFFICE')")
    public ResponseEntity<Service> getService(@PathVariable("id") Long id) {
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
        return ResponseEntity.ok(svc);
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
    public ResponseEntity<java.util.List<java.util.Map<String, Object>>> autocomplete(
            @RequestParam(name = "q") String q,
            @RequestParam(name = "limit", defaultValue = "5") int limit
    ) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
        Long tenantId = TenantContext.getTenantId();
        int max = Math.max(1, Math.min(limit, 50));
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, max);
        org.springframework.data.domain.Page<Service> page = repository.searchByTenantIdAndKeyword(tenantId, q, pageable);
        java.util.List<java.util.Map<String, Object>> out = new java.util.ArrayList<>();
        java.util.Set<String> seenKeys = new java.util.HashSet<>();
        for (Service s : page.getContent()) {
            // Key by name + contact to deduplicate suggestions
            String key = (s.getBuyerName() != null ? s.getBuyerName().toLowerCase() : "") + "|" + (s.getBuyerContact() != null ? s.getBuyerContact().toLowerCase() : "");
            if (seenKeys.contains(key)) continue;
            seenKeys.add(key);
            java.util.Map<String, Object> m = new java.util.HashMap<>();
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

        // Normalise frequently used meta fields up-front so that both the
        // persisted JSON and the downstream PDF generation have cleaned
        // document numbers without stray hash prefixes.
        if (meta.containsKey("invoiceNo")) {
            meta.put("invoiceNo", sanitizeDocCode(meta.get("invoiceNo")));
        }
        if (meta.containsKey("pinvNo")) {
            meta.put("pinvNo", sanitizeDocCode(meta.get("pinvNo")));
        }

        // Extract canonical buyer fields:
        String buyerName    = stringOrNull(buyer.get("name"));
        String buyerGst     = stringOrNull(buyer.get("gst"));
        String buyerContact = stringOrNull(buyer.get("contact"));
        String buyerEmail   = stringOrNull(buyer.get("email"));
        Service svc = new Service();
        Long tenantId = TenantContext.getTenantId();
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
            // Build PDF using HTML renderer.  The new helper generates a PDF
            // from an HTML template that mirrors the Preview.jsx design.  When
            // successfully generated, persist the PDF on disk and record a
            // Document entity with a reference to the stored file instead of
            // embedding the base64 content in the database.
            byte[] pdfBytes = com.vebops.util.PdfUtil.buildServiceInvoicePdf(saved, metaMap, itemsList, totalsMap, company);
            if (pdfBytes != null && pdfBytes.length > 0) {
                // Create a new Document entry and persist it to obtain an ID.
                com.vebops.domain.Document doc = new com.vebops.domain.Document();
                doc.setTenantId(tid);
                doc.setKind(com.vebops.domain.enums.DocumentKind.PDF);
                doc.setEntityType(com.vebops.domain.enums.DocumentEntityType.SR);
                doc.setEntityId(saved.getId());
                // Derive a filename from meta (invoiceNo) or default to service‑ID
                String fileName = null;
                Object invNo = metaMap.get("invoiceNo");
                if (invNo instanceof String invStr && !invStr.trim().isEmpty()) {
                    fileName = invStr.trim();
                }
                if (fileName == null) {
                    fileName = "service-" + saved.getId();
                }
                // Ensure .pdf extension
                String baseFilename = fileName + ".pdf";
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
        } else {
            docs = documentRepo.findByEntityTypeAndEntityIdAndTenantId(DocumentEntityType.SR, id, tid);
            if (docs == null || docs.isEmpty()) {
                docs = documentRepo.findByEntityTypeAndEntityIdAndTenantId(DocumentEntityType.INVOICE, id, tid);
            }
        }
        Document doc = (docs != null && !docs.isEmpty()) ? docs.get(0) : null;

        // 2) if missing or invalid, generate now.  Attempt to load bytes
        // from disk or decode base64.  If successful, return existing doc.
        byte[] existing = (doc != null) ? loadDocumentBytes(doc) : null;
        if (existing != null && existing.length > 0) {
            return doc;
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
            doc.setEntityType(proforma ? DocumentEntityType.PROFORMA : DocumentEntityType.SR);
            doc.setEntityId(id);
            doc.setKind(DocumentKind.PDF);
            doc.setUploadedAt(Instant.now());
        } else if (proforma && doc.getEntityType() != DocumentEntityType.PROFORMA) {
            doc.setEntityType(DocumentEntityType.PROFORMA);
        }
        // Determine a filename from meta (invoiceNo or PINV/PINV etc.)
        String fname = computeFileName(meta, id, proforma) + ".pdf";
        doc.setFilename(fname);
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