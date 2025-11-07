package com.vebops.service;


import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.vebops.context.TenantContext;
import com.vebops.domain.Customer;
import com.vebops.domain.Document;
import com.vebops.domain.Invoice;
import com.vebops.domain.InvoiceLine;
import com.vebops.domain.Proposal;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.CustomerRepository;
import com.vebops.repository.DocumentRepository;
import com.vebops.repository.InvoiceLineRepository;
import com.vebops.repository.InvoiceRepository;
import com.vebops.repository.ProposalRepository;
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

    public CustomerService(ProposalRepository proposalRepo,
                           ProposalService proposals,
                           InvoiceRepository invoiceRepo,
                           InvoiceLineRepository invLineRepo, DocumentRepository docRepo,
                           CustomerRepository customerRepo, FileStorageService fileStorageService) {
        this.proposalRepo = proposalRepo;
        this.proposals = proposals;
        this.invoiceRepo = invoiceRepo;
        this.invLineRepo = invLineRepo;
        this.docRepo = docRepo;
        this.customerRepo = customerRepo;
        this.fileStorageService = fileStorageService;
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
    public ResponseEntity<List<Proposal>> myProposals(Long customerId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Long cid = (customerId != null) ? customerId : me.getId();
        if (!cid.equals(me.getId())) throw new BusinessException("You can only view your own proposals");
        List<Proposal> list = proposalRepo.findByTenantIdAndCustomer_Id(tid, cid);
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

    public ResponseEntity<List<Document>> proposalDocuments(Long proposalId, Long customerId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Long cid = (customerId != null) ? customerId : me.getId();
        Proposal p = proposalRepo.findById(proposalId).orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (!tid.equals(p.getTenantId())) throw new BusinessException("Cross-tenant access");
        if (!p.getCustomer().getId().equals(cid) || !cid.equals(me.getId())) throw new BusinessException("Not your proposal");
        var docs = docRepo.findByEntityTypeAndEntityIdAndTenantId(
            com.vebops.domain.enums.DocumentEntityType.PROPOSAL, proposalId, tid);
        return ResponseEntity.ok(docs);
    }

    public ResponseEntity<List<Invoice>> myInvoices(Long customerId) {
        Long tid = tenant();
        Customer me = currentCustomerOrThrow();
        Long cid = (customerId != null) ? customerId : me.getId();
        if (!cid.equals(me.getId())) throw new BusinessException("You can only view your own invoices");
        List<Invoice> list = invoiceRepo.findByTenantIdAndCustomer_Id(tid, cid);
        list.forEach(inv -> {
            inv.getCustomer().getName();
            inv.getWorkOrder().getWan();
        });
        return ResponseEntity.ok(list);
    }

    // Upload a PO PDF as a document under the proposal (does not change status)
// MULTIPART upload for PO PDF (customer uploads a PO document)
public ResponseEntity<Document> uploadProposalDocumentFile(Long proposalId, MultipartFile file) {
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
    // stop proxies/CDNs from re-encoding or "optimizing"
    headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate, no-transform");
    headers.add(HttpHeaders.PRAGMA, "no-cache");
    headers.add(HttpHeaders.EXPIRES, "0");

    return new ResponseEntity<>(body, headers, HttpStatus.OK);
  } catch (IOException e) {
    throw new BusinessException("Failed to read file");
  }
}

    
}