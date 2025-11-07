package com.vebops.web;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.vebops.domain.Document;
import com.vebops.domain.Invoice;
import com.vebops.domain.Proposal;
import com.vebops.service.CustomerService;

/**
 * Thin controller delegating customer-facing endpoints to {@link CustomerService}.
 * All business logic resides in the service layer.
 */
@RestController
@RequestMapping("/customer")
@Validated
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerController {

    private final CustomerService svc;

    public CustomerController(CustomerService svc) {
        this.svc = svc;
    }

    @GetMapping("/proposals")
    public ResponseEntity<List<Proposal>> myProposals(@RequestParam(required = false) Long customerId) {
        return svc.myProposals(customerId);
    }

    @PostMapping("/proposals/{id}/po-upload")
    public ResponseEntity<Void> uploadPO(@PathVariable Long id,
                                         @RequestParam String poNumber,
                                         @RequestParam(required = false) String url) {
        return svc.uploadPO(id, poNumber, url);
    }

    @GetMapping(value = "/invoices/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable Long id) {
        return svc.downloadInvoice(id);
    }

    @GetMapping("/proposals/{id}/documents")
    public ResponseEntity<List<Document>> proposalDocs(@PathVariable Long id, @RequestParam(required = false) Long customerId) {
        return svc.proposalDocuments(id, customerId);
    }

    @GetMapping("/invoices")
    public ResponseEntity<List<Invoice>> myInvoices(@RequestParam(required = false) Long customerId) {
        return svc.myInvoices(customerId);
    }

    // MULTIPART upload for PO PDF (separate from poNumber approval endpoint)
    @PostMapping(value = "/proposals/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Document> uploadProposalDocFile(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @RequestPart(value = "type", required = false) String typeIgnored) {
        return svc.uploadProposalDocumentFile(id, file);
    }

    // BLOB download (customer-guarded)
    @GetMapping("/proposals/{proposalId}/documents/{docId}/download")
    public ResponseEntity<Resource> downloadProposalDocAsCustomer(
            @PathVariable Long proposalId,
            @PathVariable Long docId) {
        return svc.downloadProposalDocument(proposalId, docId);
    }

}