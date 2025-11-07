package com.vebops.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

import com.vebops.domain.Document;
import com.vebops.domain.Proposal;
import com.vebops.domain.ProposalItem;
import com.vebops.domain.Customer;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.dto.ProposalPdfRequest;
import com.vebops.repository.DocumentRepository;

@Service
public class ProposalDocumentService {
    private final FileStorageService storage;
    private final DocumentRepository docs;

    public ProposalDocumentService(FileStorageService storage, DocumentRepository docs){
        this.storage = storage;
        this.docs = docs;
    }

    @Transactional
    public Document generate(Long tenantId, Proposal p, List<ProposalItem> items, ProposalPdfRequest req, Customer customer) {
        byte[] pdf = com.vebops.util.PdfUtil.buildProposalPdf(p, items, req, customer);

        // Persist a Document row first to get docId for path
        Document d = new Document();
        d.setTenantId(tenantId);
        d.setEntityType(DocumentEntityType.PROPOSAL);
        d.setEntityId(p.getId());
        d.setKind(DocumentKind.PDF);
        d.setUploadedAt(Instant.now());
        d = docs.saveAndFlush(d);

        // store file
        String filename = "Proposal-P" + p.getId() + ".pdf";
        try {
            String saved = storage.saveProposalDoc(tenantId, p.getId(), d.getId(), filename, pdf);
            d.setFilename(saved);
        } catch (java.io.IOException e) {
            throw new com.vebops.exception.BusinessException("Failed to store proposal PDF");
        }

        // Back office download url (customer has their own /customer/... endpoint)
        d.setUrl(String.format("/office/proposals/%d/documents/%d/download", p.getId(), d.getId()));
        return docs.save(d);
    }

    public Document latestPdf(Long tenantId, long proposalId) {
        var list = docs.findByEntityTypeAndEntityIdAndTenantId(
            DocumentEntityType.PROPOSAL, proposalId, tenantId);
        return list.stream()
            .filter(d -> d.getKind() == DocumentKind.PDF)
            .max(Comparator.comparing(Document::getUploadedAt))
            .orElse(null);
    }
}
