package com.vebops.service;


import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.vebops.context.TenantContext;
import com.vebops.domain.CompanyDetails;
import com.vebops.domain.Customer;
import com.vebops.domain.CustomerPO;
import com.vebops.domain.Document;
import com.vebops.domain.Invoice;
import com.vebops.domain.InvoiceLine;
import com.vebops.domain.Proposal;
import com.vebops.domain.ServiceRequest;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.domain.WorkOrderProgressAttachment;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.domain.enums.InvoiceStatus;
import com.vebops.domain.enums.ProposalStatus;
import com.vebops.domain.enums.WOStatus;
import com.vebops.dto.CustomerDashboardSummary;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.CompanyDetailsRepository;
import com.vebops.repository.CustomerPORepository;
import com.vebops.repository.CustomerRepository;
import com.vebops.repository.DocumentRepository;
import com.vebops.repository.InvoiceLineRepository;
import com.vebops.repository.InvoiceRepository;
import com.vebops.repository.ProposalRepository;
import com.vebops.repository.WorkOrderProgressAttachmentRepository;
import com.vebops.repository.WorkOrderProgressRepository;
import com.vebops.repository.WorkOrderRepository;
import com.vebops.util.PdfUtil;

/**
 * Service encapsulating all customer-facing operations originally defined in
 * {@link com.vebops.web.CustomerController}. Business logic resides here
 * to decouple controllers from persistence and transactional concerns.
 */
@Service
public class CustomerService {

    private final ProposalRepository proposalRepo;
    private final ProposalService proposals;
    private final InvoiceRepository invoiceRepo;
    private final InvoiceLineRepository invLineRepo;
    private final DocumentRepository docRepo;
    private final CustomerRepository customerRepo;
    private final FileStorageService fileStorageService;
    private final CustomerPORepository customerPORepo;
    private final WorkOrderRepository workOrderRepo;
    private final WorkOrderProgressRepository workOrderProgressRepo;
    private final WorkOrderProgressAttachmentRepository progressAttachmentRepo;
    private final com.vebops.repository.ServiceRepository serviceRepo;
    private final CompanyDetailsRepository companyRepo;
    private final ObjectMapper objectMapper;

    public CustomerService(ProposalRepository proposalRepo,
                           ProposalService proposals,
                           InvoiceRepository invoiceRepo,
                           InvoiceLineRepository invLineRepo, DocumentRepository docRepo,
                           CustomerRepository customerRepo, FileStorageService fileStorageService,
                           CustomerPORepository customerPORepo,
                           WorkOrderRepository workOrderRepo,
                           WorkOrderProgressRepository workOrderProgressRepo,
                           WorkOrderProgressAttachmentRepository progressAttachmentRepo,
                           com.vebops.repository.ServiceRepository serviceRepo,
                           CompanyDetailsRepository companyRepo,
                           ObjectMapper objectMapper) {
        this.proposalRepo = proposalRepo;
        this.proposals = proposals;
        this.invoiceRepo = invoiceRepo;
        this.invLineRepo = invLineRepo;
        this.docRepo = docRepo;
        this.customerRepo = customerRepo;
        this.fileStorageService = fileStorageService;
        this.customerPORepo = customerPORepo;
        this.workOrderRepo = workOrderRepo;
        this.workOrderProgressRepo = workOrderProgressRepo;
        this.progressAttachmentRepo = progressAttachmentRepo;
        this.serviceRepo = serviceRepo;
        this.companyRepo = companyRepo;
        this.objectMapper = objectMapper;
    }

    private Long tenant() { return TenantContext.getTenantId(); }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object p = auth.getPrincipal();
        return (p instanceof Long) ? (Long)p : null;
    }

    private Customer currentCustomerOrThrow() {
        Long tid = tenant();
        Long uid = currentUserId();
        if (uid == null) throw new BusinessException("Unauthorized");
        return customerRepo.findByTenantIdAndPortalUser_Id(tid, uid)
                .orElseThrow(() -> new BusinessException("No customer profile linked to this user"));
    }

    /**
     * Returns proposals belonging to the given customer id within the current tenant.
     * Touches nested associations to avoid serialization of lazy proxies.
     */
    public ResponseEntity<List<CustomerProposalRow>> myProposals(Long customerId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Long cid = (customerId != null) ? customerId : me.getId();
        if (!cid.equals(me.getId())) throw new BusinessException("You can only view your own proposals");
        List<Proposal> list = proposalRepo.findByTenantIdAndCustomer_Id(tid, cid);
        List<CustomerProposalRow> rows = list.stream()
            .map(p -> CustomerProposalRow.from(
                p,
                customerPORepo.findFirstByTenantIdAndProposal_IdOrderByUploadedAtDesc(tid, p.getId()).orElse(null)
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(rows);
    }

    public ResponseEntity<CustomerDashboardSummary> dashboard(Long customerId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Long cid = (customerId != null) ? customerId : me.getId();
        if (!cid.equals(me.getId())) {
            throw new BusinessException("You can only view your own dashboard");
        }

        List<Proposal> proposals = proposalRepo.findByTenantIdAndCustomer_Id(tid, cid);
        proposals.forEach(p -> {
            if (p.getStatus() != null) {
                p.getStatus().name();
            }
        });
        List<WorkOrder> workOrders = workOrderRepo.findByTenantIdAndServiceRequest_Customer_IdOrderByCreatedAtDesc(tid, cid);
        workOrders.forEach(wo -> {
            if (wo.getStatus() != null) {
                wo.getStatus().name();
            }
        });
        List<Invoice> invoices = invoiceRepo.findByTenantIdAndCustomer_Id(tid, cid);

        long openProposals = proposals.stream()
                .filter(p -> p.getStatus() == ProposalStatus.DRAFT || p.getStatus() == ProposalStatus.SENT)
                .count();
        long awaitingPo = proposals.stream()
                .filter(p -> p.getStatus() == ProposalStatus.SENT)
                .count();
        long approvedProposals = proposals.stream()
                .filter(p -> p.getStatus() == ProposalStatus.APPROVED)
                .count();

        EnumSet<WOStatus> activeStatuses = EnumSet.of(WOStatus.NEW, WOStatus.ASSIGNED, WOStatus.IN_PROGRESS, WOStatus.ON_HOLD);
        long activeWorkOrders = workOrders.stream()
                .filter(wo -> wo.getStatus() != null && activeStatuses.contains(wo.getStatus()))
                .count();
        long inProgressWorkOrders = workOrders.stream()
                .filter(wo -> wo.getStatus() == WOStatus.IN_PROGRESS)
                .count();
        long completedWorkOrders = workOrders.stream()
                .filter(wo -> wo.getStatus() == WOStatus.COMPLETED)
                .count();

        EnumSet<InvoiceStatus> pendingStatuses = EnumSet.of(
                InvoiceStatus.DRAFT,
                InvoiceStatus.SENT,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.OVERDUE
        );
        long pendingInvoices = invoices.stream()
                .filter(inv -> inv.getStatus() != null && pendingStatuses.contains(inv.getStatus()))
                .count();
        BigDecimal outstandingAmount = invoices.stream()
                .filter(inv -> inv.getStatus() != null && pendingStatuses.contains(inv.getStatus()))
                .map(inv -> Optional.ofNullable(inv.getTotal()).orElse(BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Instant lastProgress = null;
        for (WorkOrder wo : workOrders) {
            Instant progress = latestProgressInstant(tid, wo.getId());
            if (progress == null) {
                progress = wo.getUpdatedAt();
            }
            if (progress != null && (lastProgress == null || progress.isAfter(lastProgress))) {
                lastProgress = progress;
            }
        }

        return ResponseEntity.ok(new CustomerDashboardSummary(
                openProposals,
                awaitingPo,
                approvedProposals,
                activeWorkOrders,
                inProgressWorkOrders,
                completedWorkOrders,
                pendingInvoices,
                outstandingAmount,
                lastProgress
        ));
    }

    /**
     * Approves a proposal by uploading PO details. Delegates to ProposalService.
     */
    public ResponseEntity<Void> uploadPO(Long id, String poNumber, String url) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Proposal p = proposalRepo.findById(id).orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (!tid.equals(p.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (!p.getCustomer().getId().equals(me.getId())) throw new BusinessException("Not your proposal");
        proposals.approve(tid, id, null, poNumber, url);
        return ResponseEntity.noContent().build();
    }

    /**
     * Generates and returns a PDF invoice. Ensures the invoice belongs to the current tenant and touches
     * nested associations to avoid lazy proxy issues.
     */
    public ResponseEntity<byte[]> downloadInvoice(Long id) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Invoice inv = invoiceRepo.findById(id).orElseThrow(() -> new NotFoundException("Invoice not found"));
        if (!tid.equals(inv.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (!inv.getCustomer().getId().equals(me.getId())) throw new BusinessException("Not your invoice");
        List<InvoiceLine> lines = invLineRepo.findByTenantIdAndInvoice_Id(tid, id);
        byte[] pdf = PdfUtil.buildInvoicePdf(inv, lines);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=invoice-" + inv.getInvoiceNo() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    public ResponseEntity<byte[]> downloadServiceInvoice(Long workOrderId, String type) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        WorkOrder wo = workOrderRepo.findById(workOrderId)
                .orElseThrow(() -> new NotFoundException("Work order not found"));
        if (!tid.equals(wo.getTenantId())) {
            throw new BusinessException("Cross-tenant access");
        }
        ServiceRequest sr = wo.getServiceRequest();
        if (sr == null || sr.getCustomer() == null || !Objects.equals(sr.getCustomer().getId(), me.getId())) {
            throw new BusinessException("Not your work order");
        }

        boolean proforma = type != null && type.equalsIgnoreCase("PROFORMA");
        com.vebops.domain.Service service = resolveLinkedService(tid, sr.getId(), wo.getId());
        if (service == null) {
            throw new NotFoundException("Service invoice not available");
        }

        Document doc = findServiceDocument(tid, service.getId(), proforma);
        byte[] pdf = loadServiceDocumentBytes(doc);

        Map<String, Object> meta = new LinkedHashMap<>(readServiceMap(service.getMetaJson()));
        String baseName = computeServiceFileName(meta, service.getId(), proforma);

        if (pdf == null || pdf.length == 0) {
            meta.put("docType", proforma ? "PROFORMA" : "INVOICE");
            pdf = generateServiceInvoicePdf(service, meta, readServiceList(service.getItemsJson()),
                    readServiceMap(service.getTotalsJson()), tid);
        }

        if (pdf == null || pdf.length == 0) {
            throw new BusinessException("Invoice document unavailable");
        }

        String filename = (doc != null && doc.getFilename() != null && !doc.getFilename().isBlank())
                ? doc.getFilename()
                : baseName + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentLength(pdf.length);
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build());
        headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");
        headers.add(HttpHeaders.PRAGMA, "no-cache");
        headers.add(HttpHeaders.EXPIRES, "0");

        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }

    public ResponseEntity<List<ProposalDocumentRow>> proposalDocuments(Long proposalId, Long customerId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Long cid = (customerId != null) ? customerId : me.getId();
        Proposal p = proposalRepo.findById(proposalId).orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (!tid.equals(p.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (!p.getCustomer().getId().equals(cid) || !cid.equals(me.getId())) throw new BusinessException("Not your proposal");
        var docs = docRepo.findByEntityTypeAndEntityIdAndTenantId(
            com.vebops.domain.enums.DocumentEntityType.PROPOSAL, proposalId, tid);
        List<ProposalDocumentRow> rows = docs.stream()
            .map(d -> ProposalDocumentRow.from(d, proposalId))
            .collect(Collectors.toList());
        return ResponseEntity.ok(rows);
    }

    public ResponseEntity<List<CustomerInvoiceRow>> myInvoices(Long customerId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Long cid = (customerId != null) ? customerId : me.getId();
        if (!cid.equals(me.getId())) throw new BusinessException("You can only view your own invoices");
        List<Invoice> list = invoiceRepo.findByTenantIdAndCustomer_Id(tid, cid);
        List<CustomerInvoiceRow> rows = list.stream()
            .map(CustomerInvoiceRow::from)
            .collect(Collectors.toList());
        return ResponseEntity.ok(rows);
    }

    public ResponseEntity<List<CustomerWorkOrderRow>> myWorkOrders(Long customerId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Long cid = (customerId != null) ? customerId : me.getId();
        if (!cid.equals(me.getId())) {
            throw new BusinessException("You can only view your own work orders");
        }
        List<WorkOrder> list = workOrderRepo
                .findByTenantIdAndServiceRequest_Customer_IdOrderByCreatedAtDesc(tid, cid);
        List<CustomerWorkOrderRow> rows = new ArrayList<>(list.size());
        for (WorkOrder wo : list) {
            touchWorkOrderGraph(wo);
            rows.add(CustomerWorkOrderRow.from(wo, resolveSiteAddress(wo)));
        }
        return ResponseEntity.ok(rows);
    }

    public ResponseEntity<CustomerWorkOrderDetail> workOrderDetail(Long workOrderId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        WorkOrder wo = workOrderRepo.findById(workOrderId)
                .orElseThrow(() -> new NotFoundException("Work order not found"));
        if (!tid.equals(wo.getTenantId())) throw new BusinessException("Cross-tenant access");
        ServiceRequest sr = wo.getServiceRequest();
        if (sr == null || sr.getCustomer() == null || !Objects.equals(sr.getCustomer().getId(), me.getId())) {
            throw new BusinessException("Not your work order");
        }

        touchWorkOrderGraph(wo);

        List<WorkOrderProgress> progress = workOrderProgressRepo
                .findByTenantIdAndWorkOrder_IdOrderByCreatedAtAsc(tid, workOrderId);
        Map<Long, List<WorkOrderProgressAttachment>> attachmentsByProgress = Map.of();
        List<Long> progressIds = progress.stream()
                .map(WorkOrderProgress::getId)
                .filter(Objects::nonNull)
                .toList();
        if (!progressIds.isEmpty()) {
            attachmentsByProgress = progressAttachmentRepo
                    .findByTenantIdAndProgress_IdIn(tid, progressIds)
                    .stream()
                    .filter(att -> att.getProgress() != null && att.getProgress().getId() != null)
                    .collect(Collectors.groupingBy(att -> att.getProgress().getId()));
        }

        List<ProgressEntry> progressEntries = new ArrayList<>(progress.size());
        for (WorkOrderProgress entry : progress) {
            progressEntries.add(toProgressEntry(wo.getId(), entry, attachmentsByProgress));
        }

        String siteAddress = resolveSiteAddress(wo);
        CustomerWorkOrderRow row = CustomerWorkOrderRow.from(wo, siteAddress);
        ServiceInfoSummary service = ServiceInfoSummary.from(wo, siteAddress);
        CustomerWorkOrderDetail detail = new CustomerWorkOrderDetail(row, service, progressEntries);
        return ResponseEntity.ok(detail);
    }

    public ResponseEntity<byte[]> completionReport(Long workOrderId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        WorkOrder wo = workOrderRepo.findById(workOrderId)
                .orElseThrow(() -> new NotFoundException("Work order not found"));
        if (!tid.equals(wo.getTenantId())) throw new BusinessException("Cross-tenant access");
        ServiceRequest sr = wo.getServiceRequest();
        if (sr == null || sr.getCustomer() == null || !Objects.equals(sr.getCustomer().getId(), me.getId())) {
            throw new BusinessException("Not your work order");
        }

        touchWorkOrderGraph(wo);

        List<WorkOrderProgress> progress = workOrderProgressRepo
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
            for (WorkOrderProgress p : progress) {
                List<WorkOrderProgressAttachment> att = attachments.get(p.getId());
                if (att != null) {
                    att.forEach(p::addAttachment);
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

    public ResponseEntity<byte[]> downloadProgressAttachment(Long woId, Long progressId, Long attachmentId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
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
        if (!Objects.equals(progress.getId(), progressId) || !Objects.equals(wo.getId(), woId)) {
            throw new BusinessException("Attachment does not belong to the requested work order");
        }
        ServiceRequest sr = wo.getServiceRequest();
        if (sr == null || sr.getCustomer() == null || !Objects.equals(sr.getCustomer().getId(), me.getId())) {
            throw new BusinessException("Not your work order");
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
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + filename.replace("\"", "") + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(data);
    }

    private void touchWorkOrderGraph(WorkOrder wo) {
        if (wo == null) {
            return;
        }
        ServiceRequest sr = wo.getServiceRequest();
        if (sr != null) {
            sr.getId();
            sr.getSrn();
            sr.getDescription();
            sr.getServiceType();
            sr.getSiteAddress();
            if (sr.getCustomer() != null) {
                sr.getCustomer().getId();
                sr.getCustomer().getName();
                sr.getCustomer().getEmail();
                sr.getCustomer().getMobile();
                sr.getCustomer().getAddress();
            }
        }
        if (wo.getCustomerPO() != null) {
            wo.getCustomerPO().getId();
            wo.getCustomerPO().getPoNumber();
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
    }

    private ProgressEntry toProgressEntry(Long woId,
                                          WorkOrderProgress progress,
                                          Map<Long, List<WorkOrderProgressAttachment>> attachmentsByProgress) {
        if (progress == null) {
            return null;
        }
        String status = progress.getStatus() != null ? progress.getStatus().name() : null;
        ProgressUser by = null;
        if (progress.getByFE() != null) {
            progress.getByFE().getId();
            String name = progress.getByFE().getUser() != null
                    ? progress.getByFE().getUser().getDisplayName()
                    : progress.getByFE().getName();
            by = new ProgressUser(progress.getByFE().getId(), name);
        }
        List<WorkOrderProgressAttachment> attachmentList = attachmentsByProgress
                .getOrDefault(progress.getId(), List.of());
        List<ProgressAttachmentView> views = new ArrayList<>(attachmentList.size());
        for (WorkOrderProgressAttachment attachment : attachmentList) {
            views.add(toAttachmentView(woId, progress.getId(), attachment));
        }
        return new ProgressEntry(
                progress.getId(),
                status,
                progress.getRemarks(),
                progress.getPhotoUrl(),
                progress.getCreatedAt(),
                by,
                views
        );
    }

    private ProgressAttachmentView toAttachmentView(Long woId,
                                                    Long progressId,
                                                    WorkOrderProgressAttachment attachment) {
        Long id = attachment.getId();
        String filename = attachment.getFilename();
        String contentType = attachment.getContentType();
        Long size = attachment.getSize();
        Instant uploadedAt = attachment.getUploadedAt();
        String downloadPath = id == null
                ? null
                : String.format("/customer/work-orders/%d/progress/%d/attachments/%d", woId, progressId, id);
        return new ProgressAttachmentView(id, filename, contentType, size, uploadedAt, downloadPath);
    }

    private Instant latestProgressInstant(Long tenantId, Long workOrderId) {
        if (tenantId == null || workOrderId == null) {
            return null;
        }
        return workOrderProgressRepo.findTop1ByTenantIdAndWorkOrder_IdOrderByCreatedAtDesc(tenantId, workOrderId)
                .map(WorkOrderProgress::getCreatedAt)
                .orElse(null);
    }

    private String resolveSiteAddress(WorkOrder wo) {
        if (wo == null) {
            return null;
        }
        ServiceRequest sr = wo.getServiceRequest();
        String[] candidates = new String[] {
                sr != null ? sr.getSiteAddress() : null,
                (sr != null && sr.getCustomer() != null) ? sr.getCustomer().getAddress() : null,
                resolveConsigneeAddress(wo)
        };
        for (String candidate : candidates) {
            String trimmed = trimToNull(candidate);
            if (trimmed != null) {
                return trimmed;
            }
        }
        return null;
    }

    private String resolveConsigneeAddress(WorkOrder wo) {
        if (wo == null) {
            return null;
        }
        ServiceRequest sr = wo.getServiceRequest();
        Long tenantId = wo.getTenantId();
        Long srId = sr != null ? sr.getId() : null;
        Long woId = wo.getId();
        com.vebops.domain.Service service = resolveLinkedService(tenantId, srId, woId);
        return service != null ? trimToNull(service.getConsigneeAddress()) : null;
    }

    private com.vebops.domain.Service resolveLinkedService(Long tenantId, Long srId, Long woId) {
        if (tenantId == null) {
            return null;
        }
        List<com.vebops.domain.Service> candidates = serviceRepo.findTop50ByTenantIdOrderByCreatedAtDesc(tenantId);
        com.vebops.domain.Service srMatch = null;
        com.vebops.domain.Service woMatch = null;
        for (com.vebops.domain.Service svc : candidates) {
            if (svc == null) {
                continue;
            }
            String meta = svc.getMetaJson();
            String compact = meta != null ? meta.replaceAll("\\s+", "") : null;
            boolean matchesSr = srId != null && metaContains(compact, srId, "serviceRequestId", "srId");
            boolean matchesWo = woId != null && metaContains(compact, woId, "workOrderId", "woId");
            if (matchesSr && matchesWo) {
                return svc;
            }
            if (matchesSr && srMatch == null) {
                srMatch = svc;
            }
            if (matchesWo && woMatch == null) {
                woMatch = svc;
            }
        }
        return srMatch != null ? srMatch : woMatch;
    }

    private Document findServiceDocument(Long tenantId, Long serviceId, boolean proforma) {
        if (tenantId == null || serviceId == null) {
            return null;
        }
        DocumentEntityType desired = proforma ? DocumentEntityType.PROFORMA : DocumentEntityType.INVOICE;
        List<Document> docs = docRepo.findByEntityTypeAndEntityIdAndTenantId(desired, serviceId, tenantId);
        if ((docs == null || docs.isEmpty()) && desired != DocumentEntityType.SR) {
            docs = docRepo.findByEntityTypeAndEntityIdAndTenantId(DocumentEntityType.SR, serviceId, tenantId);
        }
        return (docs != null && !docs.isEmpty()) ? docs.get(0) : null;
    }

    private byte[] loadServiceDocumentBytes(Document doc) {
        if (doc == null || doc.getUrl() == null) {
            return null;
        }
        String url = doc.getUrl();
        String prefix = "data:application/pdf;base64,";
        if (url.startsWith(prefix)) {
            try {
                return Base64.getDecoder().decode(url.substring(prefix.length()));
            } catch (Exception ignored) {
                return null;
            }
        }
        try {
            java.io.File file = fileStorageService.loadServiceInvoiceDoc(tenant(), doc.getEntityId(), doc.getId(), url);
            if (file != null && file.exists()) {
                return Files.readAllBytes(file.toPath());
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private byte[] generateServiceInvoicePdf(com.vebops.domain.Service service,
                                             Map<String, Object> meta,
                                             List<Map<String, Object>> items,
                                             Map<String, Object> totals,
                                             Long tenantId) {
        CompanyDetails company = companyRepo.findByTenantId(tenantId).orElse(null);
        return PdfUtil.buildServiceInvoicePdf(service, meta, items, totals, company);
    }

    private Map<String, Object> readServiceMap(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private List<Map<String, Object>> readServiceList(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private String computeServiceFileName(Map<String, Object> meta, Long serviceId, boolean proforma) {
        String invoice = sanitizeDocCode(meta.get("invoiceNo"));
        String pinv = sanitizeDocCode(meta.get("pinvNo"));
        String base = proforma
                ? (!pinv.isEmpty() ? pinv : (!invoice.isEmpty() ? invoice : "service-" + serviceId + "-proforma"))
                : (!invoice.isEmpty() ? invoice : (!pinv.isEmpty() ? pinv : "service-" + serviceId));
        if (base == null || base.isBlank()) {
            return proforma ? ("service-" + serviceId + "-proforma") : ("service-" + serviceId);
        }
        return base;
    }

    private String sanitizeDocCode(Object value) {
        if (value == null) {
            return "";
        }
        String code = String.valueOf(value).trim();
        if (code.isEmpty()) {
            return "";
        }
        while (code.startsWith("#")) {
            code = code.substring(1).trim();
        }
        return code;
    }

    private boolean metaContains(String compactMeta, Long value, String... keys) {
        if (compactMeta == null || value == null || keys == null || keys.length == 0) {
            return false;
        }
        String str = value.toString();
        for (String key : keys) {
            if (key == null) {
                continue;
            }
            String prefix = "\"" + key + "\":";
            if (compactMeta.contains(prefix + str) || compactMeta.contains(prefix + "\"" + str + "\"")) {
                return true;
            }
        }
        return false;
    }

    private static BigDecimal sanitizeAmount(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private static BigDecimal computeTotalAmount(BigDecimal explicit,
                                                 BigDecimal subtotal,
                                                 BigDecimal tax,
                                                 boolean hadSubtotal,
                                                 boolean hadTax) {
        BigDecimal safeSubtotal = subtotal != null ? subtotal : BigDecimal.ZERO;
        BigDecimal safeTax = tax != null ? tax : BigDecimal.ZERO;
        BigDecimal sum = safeSubtotal.add(safeTax);
        boolean hasComponents = hadSubtotal || hadTax;
        if (explicit == null) {
            return hasComponents ? sum : null;
        }
        if (hasComponents && explicit.compareTo(sum) != 0) {
            return sum;
        }
        return explicit;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    // Upload a PO PDF as a document under the proposal (does not change status)
    public ResponseEntity<ProposalDocumentRow> uploadProposalDocumentFile(Long proposalId, MultipartFile file) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Proposal p = proposalRepo.findById(proposalId).orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (!tid.equals(p.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (!p.getCustomer().getId().equals(me.getId())) throw new BusinessException("Not your proposal");

        Document d = new Document();
        d.setTenantId(tid);
        d.setEntityType(DocumentEntityType.PROPOSAL);
        d.setEntityId(p.getId());
        d.setKind(DocumentKind.PDF);
        d.setUploadedAt(java.time.Instant.now());
        docRepo.saveAndFlush(d);

        try {
            String savedName = fileStorageService.saveProposalDoc(tid, proposalId, d.getId(), file);
            d.setFilename(savedName);       // <— important
        } catch (IOException e) {
            throw new BusinessException("Failed to store file");
        }

        d.setUrl(String.format("/customer/proposals/%d/documents/%d/download", proposalId, d.getId()));
        docRepo.save(d);

        return ResponseEntity.ok(ProposalDocumentRow.from(d, proposalId));
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
            // stop proxies/CDNs from re-encoding or "optimizing"
            headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate, no-transform");
            headers.add(HttpHeaders.PRAGMA, "no-cache");
            headers.add(HttpHeaders.EXPIRES, "0");

            return new ResponseEntity<>(body, headers, HttpStatus.OK);
        } catch (IOException e) {
            throw new BusinessException("Failed to read file");
        }
    }

    public record CustomerSummary(Long id, String name, String email, String mobile) {
        static CustomerSummary from(Customer c) {
            if (c == null) return null;
            return new CustomerSummary(c.getId(), c.getName(), c.getEmail(), c.getMobile());
        }
    }

    public record CustomerPoSummary(Long id, String poNumber, String fileUrl, java.time.Instant uploadedAt) {
        static CustomerPoSummary from(CustomerPO po) {
            if (po == null) return null;
            return new CustomerPoSummary(po.getId(), po.getPoNumber(), po.getFileUrl(), po.getUploadedAt());
        }
    }

    public record CustomerProposalRow(
            Long id,
            String code,
            String proposalNo,
            com.vebops.domain.enums.ProposalStatus status,
            java.math.BigDecimal subtotal,
            java.math.BigDecimal tax,
            java.math.BigDecimal total,
            java.time.Instant createdAt,
            CustomerSummary customer,
            CustomerPoSummary customerPO,
            String customerPoNumber,
            String serviceType
    ) {
        static CustomerProposalRow from(Proposal p, CustomerPO latestPo) {
            String code = (p.getId() != null) ? "P-" + p.getId() : null;
            CustomerPoSummary poSummary = CustomerPoSummary.from(latestPo);
            java.math.BigDecimal subtotal = sanitizeAmount(p.getSubtotal());
            java.math.BigDecimal tax = sanitizeAmount(p.getTax());
            java.math.BigDecimal total = computeTotalAmount(p.getTotal(), subtotal, tax,
                    p.getSubtotal() != null, p.getTax() != null);
            return new CustomerProposalRow(
                p.getId(),
                code,
                code,
                p.getStatus(),
                subtotal,
                tax,
                total != null ? total : subtotal.add(tax),
                p.getCreatedAt(),
                CustomerSummary.from(p.getCustomer()),
                poSummary,
                poSummary != null ? poSummary.poNumber() : null,
                p.getServiceType() != null ? p.getServiceType().name() : null
            );
        }
    }

    public record CustomerWorkOrderRow(
            Long id,
            String wan,
            String status,
            Instant createdAt,
            Instant updatedAt,
            java.time.LocalDate startDate,
            java.time.LocalDate dueDate,
            Long serviceRequestId,
            String serviceRequestNumber,
            String serviceType,
            String siteAddress,
            String customerPoNumber,
            boolean completionReportAvailable,
            String completionReportUrl
    ) {
        static CustomerWorkOrderRow from(WorkOrder wo, String siteAddress) {
            if (wo == null) return null;
            ServiceRequest sr = wo.getServiceRequest();
            String status = wo.getStatus() != null ? wo.getStatus().name() : null;
            boolean completed = "COMPLETED".equals(status);
            String completionUrl = (completed && wo.getId() != null)
                    ? String.format("/customer/work-orders/%d/completion-report", wo.getId())
                    : null;
            return new CustomerWorkOrderRow(
                    wo.getId(),
                    wo.getWan(),
                    status,
                    wo.getCreatedAt(),
                    wo.getUpdatedAt(),
                    wo.getStartDate(),
                    wo.getDueDate(),
                    sr != null ? sr.getId() : null,
                    sr != null ? sr.getSrn() : null,
                    sr != null && sr.getServiceType() != null ? sr.getServiceType().name() : null,
                    siteAddress,
                    wo.getCustomerPO() != null ? trimToNull(wo.getCustomerPO().getPoNumber()) : null,
                    completed,
                    completionUrl
            );
        }
    }

    public record ServiceInfoSummary(
            Long serviceRequestId,
            String serviceRequestNumber,
            String serviceType,
            String description,
            String siteAddress,
            String customerName,
            String customerEmail,
            String customerMobile,
            String customerPoNumber
    ) {
        static ServiceInfoSummary from(WorkOrder wo, String siteAddress) {
            if (wo == null) return null;
            ServiceRequest sr = wo.getServiceRequest();
            Customer customer = sr != null ? sr.getCustomer() : null;
            String customerPoNumber = wo.getCustomerPO() != null
                    ? trimToNull(wo.getCustomerPO().getPoNumber())
                    : null;
            return new ServiceInfoSummary(
                    sr != null ? sr.getId() : null,
                    sr != null ? sr.getSrn() : null,
                    sr != null && sr.getServiceType() != null ? sr.getServiceType().name() : null,
                    sr != null ? sr.getDescription() : null,
                    siteAddress,
                    customer != null ? trimToNull(customer.getName()) : null,
                    customer != null ? trimToNull(customer.getEmail()) : null,
                    customer != null ? trimToNull(customer.getMobile()) : null,
                    customerPoNumber
            );
        }
    }

    public record CustomerWorkOrderDetail(
            CustomerWorkOrderRow workOrder,
            ServiceInfoSummary service,
            List<ProgressEntry> progress
    ) { }

    public record ProgressEntry(
            Long id,
            String status,
            String remarks,
            String photoUrl,
            Instant createdAt,
            ProgressUser by,
            List<ProgressAttachmentView> attachments
    ) { }

    public record ProgressUser(Long id, String name) { }

    public record ProgressAttachmentView(
            Long id,
            String filename,
            String contentType,
            Long size,
            Instant uploadedAt,
            String downloadPath
    ) { }

    public record WorkOrderSummary(Long id, String wan) {
        static WorkOrderSummary from(WorkOrder wo) {
            if (wo == null) return null;
            return new WorkOrderSummary(wo.getId(), wo.getWan());
        }
    }

    public record CustomerInvoiceRow(
            Long id,
            String invoiceNo,
            java.time.LocalDate invoiceDate,
            java.math.BigDecimal subtotal,
            java.math.BigDecimal tax,
            java.math.BigDecimal total,
            com.vebops.domain.enums.InvoiceStatus status,
            WorkOrderSummary workOrder,
            String woNo
    ) {
        static CustomerInvoiceRow from(Invoice inv) {
            WorkOrderSummary workOrder = WorkOrderSummary.from(inv.getWorkOrder());
            java.math.BigDecimal subtotal = sanitizeAmount(inv.getSubtotal());
            java.math.BigDecimal tax = sanitizeAmount(inv.getTax());
            java.math.BigDecimal total = computeTotalAmount(inv.getTotal(), subtotal, tax,
                    inv.getSubtotal() != null, inv.getTax() != null);
            return new CustomerInvoiceRow(
                inv.getId(),
                inv.getInvoiceNo(),
                inv.getInvoiceDate(),
                subtotal,
                tax,
                total != null ? total : subtotal.add(tax),
                inv.getStatus(),
                workOrder,
                workOrder != null ? workOrder.wan() : null
            );
        }
    }

    public record ProposalDocumentRow(
            Long id,
            String filename,
            String originalName,
            String url,
            java.time.Instant uploadedAt,
            String type
    ) {
        static ProposalDocumentRow from(Document d, Long proposalId) {
            if (d == null) return null;
            String downloadUrl = d.getUrl();
            if (downloadUrl == null || downloadUrl.isBlank()) {
                downloadUrl = String.format("/customer/proposals/%d/documents/%d/download", proposalId, d.getId());
            }
            String kind = d.getKind() != null ? d.getKind().name() : null;
            return new ProposalDocumentRow(
                d.getId(),
                d.getFilename(),
                d.getFilename(),
                downloadUrl,
                d.getUploadedAt(),
                kind
            );
        }
    }

}
