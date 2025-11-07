// src/main/java/com/vebops/web/CustomerProposalController.java
package com.vebops.web;

import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.vebops.context.TenantContext;
import com.vebops.domain.Customer;
import com.vebops.domain.Document;
import com.vebops.domain.Proposal;
import com.vebops.domain.ProposalItem;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.domain.enums.ProposalStatus;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.CustomerRepository;
import com.vebops.repository.DocumentRepository;
import com.vebops.repository.ProposalItemRepository;
import com.vebops.repository.ProposalRepository;
import com.vebops.service.ProposalApprovalService;
import com.vebops.service.ProposalCustomerDocService;
import com.vebops.service.ProposalService;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/customers/proposals")
@Validated
public class CustomerProposalController {

    private final ProposalCustomerDocService docs;
    private final ProposalApprovalService approval;
    private final ProposalRepository proposals;
    private final ProposalItemRepository proposalItems;
    private final DocumentRepository documents;
    private final CustomerRepository customers;
    private final ProposalService proposalService;

    public CustomerProposalController(
        ProposalCustomerDocService docs,
        ProposalApprovalService approval,
        ProposalRepository proposals,
        ProposalItemRepository proposalItems,
        DocumentRepository documents,
        CustomerRepository customers,
        ProposalService proposalService
    ) {
        this.docs = docs;
        this.approval = approval;
        this.proposals = proposals;
        this.proposalItems = proposalItems;
        this.documents = documents;
        this.customers = customers;
        this.proposalService = proposalService;
    }

    private Long tenant() { return TenantContext.getTenantId(); }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object p = auth.getPrincipal();
        return (p instanceof Long) ? (Long) p : null;
    }

    private Long currentCustomerIdOrThrow() {
        Long tid = tenant();
        Long uid = currentUserId();
        if (uid == null) throw new BusinessException("Unauthorized");
        Customer c = customers.findByTenantIdAndPortalUser_Id(tid, uid)
            .orElseThrow(() -> new BusinessException("No customer profile linked to this user"));
        return c.getId();
    }

    private Proposal loadAndAuthorize(Long tenantId, Long customerId, Long proposalId) {
        Proposal p = proposals.findByTenantIdAndId(tenantId, proposalId)
            .orElseThrow(() -> new NotFoundException("Proposal not found"));
        if (p.getCustomer() == null || !p.getCustomer().getId().equals(customerId)) {
            throw new BusinessException("You do not have access to this proposal");
        }
        return p;
    }

    // ---------- Queries ----------

    /** List proposals visible to the current customer */
    @GetMapping
    public List<ProposalSummary> listMine() {
        Long tid = tenant();
        Long cid = currentCustomerIdOrThrow();
        return proposals.findByTenantIdAndCustomer_Id(tid, cid).stream()
            .map(ProposalSummary::from)
            .collect(Collectors.toList());
    }

    /** Get one proposal (summary) */
    @GetMapping("/{id}")
    public ProposalSummary getOne(@PathVariable("id") Long id) {
        Long tid = tenant();
        Long cid = currentCustomerIdOrThrow();
        return ProposalSummary.from(loadAndAuthorize(tid, cid, id));
    }

    /** Items of a proposal */
    @GetMapping("/{id}/items")
    public List<ProposalItemRow> items(@PathVariable("id") Long id) {
        Long tid = tenant();
        Long cid = currentCustomerIdOrThrow();
        loadAndAuthorize(tid, cid, id); // just to check access
        return proposalItems.findByTenantIdAndProposal_Id(tid, id).stream()
            .map(ProposalItemRow::from)
            .collect(Collectors.toList());
    }

    /** Documents attached to a proposal (customer-visible) */
    @GetMapping("/{id}/docs")
    public List<DocRow> docs(@PathVariable("id") Long id) {
        Long tid = tenant();
        Long cid = currentCustomerIdOrThrow();
        loadAndAuthorize(tid, cid, id);
        return documents.findByEntityTypeAndEntityIdAndTenantId(DocumentEntityType.PROPOSAL, id, tid).stream()
            .map(DocRow::from)
            .collect(Collectors.toList());
    }

    /** Latest generated proposal PDF for this proposal & customer */
    @GetMapping("/{id}/pdf/latest")
    public ResponseEntity<?> latestPdf(@PathVariable("id") Long id) {
        Long tid = tenant();
        Long cid = currentCustomerIdOrThrow();
        return docs.latestPdfDownload(tid, cid, id);
    }

    // ---------- Actions ----------

    /**
     * Customer clicks "Approve" (optionally uploads a PO as file)
     * Form-data:
     * - poNumber (optional)
     * - note (optional)
     * - poFile (optional, binary)
     */
    @PostMapping(path = "/{id}/approve", consumes = {"multipart/form-data"})
    public ResponseEntity<?> approve(
            @PathVariable("id") Long id,
            @RequestParam(value = "poNumber", required = false) String poNumber,
            @RequestParam(value = "note", required = false) String note,
            @RequestPart(value = "poFile", required = false) MultipartFile poFile
    ) {
        Long tid = tenant();
        Long cid = currentCustomerIdOrThrow();
        // Ensure access before invoking service
        loadAndAuthorize(tid, cid, id);
        var saved = approval.approveByCustomer(tid, id, cid, poNumber, note, poFile);
        return ResponseEntity.ok(new ApproveResp(saved.getId(), saved.getStatus().name()));
    }

    /** Customer rejects a proposal with an optional note */
    @PostMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable("id") Long id, @RequestParam(value = "note", required = false) String note) {
        Long tid = tenant();
        Long cid = currentCustomerIdOrThrow();
        loadAndAuthorize(tid, cid, id);
        // If you want to persist the note, stash it as a Document(NOTE)
        if (note != null && !note.isBlank()) {
            Document d = new Document();
            d.setTenantId(tid);
            d.setEntityType(DocumentEntityType.PROPOSAL);
            d.setEntityId(id);
            d.setKind(com.vebops.domain.enums.DocumentKind.NOTE);
            d.setFilename("customer-reject-note.txt");
            d.setUrl(null);
            d.setUploadedAt(Instant.now());
            documents.save(d);
        }
        proposalService.reject(tid, id);
        return ResponseEntity.ok(new SimpleMessage("Rejected"));
    }

    // ---------- DTOs ----------

    public record ProposalSummary(
            Long id,
            ProposalStatus status,
            java.math.BigDecimal subtotal,
            java.math.BigDecimal tax,
            java.math.BigDecimal total,
            java.time.Instant createdAt
    ) {
        static ProposalSummary from(Proposal p) {
            return new ProposalSummary(p.getId(), p.getStatus(), p.getSubtotal(), p.getTax(), p.getTotal(), p.getCreatedAt());
        }
    }

    public record ProposalItemRow(
            Long id,
            String description,
            String hsn,
            java.math.BigDecimal qty,
            java.math.BigDecimal rate,
            java.math.BigDecimal amount,
            java.math.BigDecimal taxRate
    ) {
        static ProposalItemRow from(ProposalItem it) {
            return new ProposalItemRow(
                it.getId(),
                it.getDescription(),
                it.getHsn(),
                it.getQty(),
                it.getRate(),
                it.getAmount(),
                it.getTaxRate()
            );
        }
    }

    public record DocRow(Long id, String filename, String url, java.time.Instant uploadedAt) {
        static DocRow from(Document d) { return new DocRow(d.getId(), d.getFilename(), d.getUrl(), d.getUploadedAt()); }
    }

    private record ApproveResp(Long proposalId, String status) {}
    private record SimpleMessage(String message) {}
}
