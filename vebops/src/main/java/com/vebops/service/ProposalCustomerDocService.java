package com.vebops.service;

import java.io.File;
import java.io.FileInputStream;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.vebops.domain.Document;
import com.vebops.domain.Proposal;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.ProposalRepository;

@Service
public class ProposalCustomerDocService {

    private final ProposalRepository proposals;
    private final ProposalDocumentService proposalDocs;
    private final FileStorageService storage;

    public ProposalCustomerDocService(
        ProposalRepository proposals,
        ProposalDocumentService proposalDocs,
        FileStorageService storage
    ) {
        this.proposals = proposals;
        this.proposalDocs = proposalDocs;
        this.storage = storage;
    }

    public ResponseEntity<InputStreamResource> latestPdfDownload(Long tenantId, Long customerId, Long proposalId) {
        Proposal p = proposals.findByTenantIdAndId(tenantId, proposalId)
            .orElseThrow(() -> new NotFoundException("Proposal not found"));

        if (p.getCustomer() == null || !p.getCustomer().getId().equals(customerId)) {
            throw new BusinessException("Access denied");
        }

        Document latest = proposalDocs.latestPdf(tenantId, proposalId);
        if (latest == null) throw new NotFoundException("No PDF found for this proposal");

        File file = storage.loadProposalDoc(tenantId, proposalId, latest.getId(), latest.getFilename());
        if (!file.exists()) throw new NotFoundException("PDF file missing");

        try {
            var isr = new InputStreamResource(new FileInputStream(file));
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + latest.getFilename() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(file.length())
                .body(isr);
        } catch (Exception e) {
            throw new BusinessException("Failed to read proposal PDF");
        }
    }
}
