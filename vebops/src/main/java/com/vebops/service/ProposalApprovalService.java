// src/main/java/com/vebops/service/ProposalApprovalService.java
package com.vebops.service;

import java.time.Instant;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.vebops.domain.Customer;
import com.vebops.domain.Document;
import com.vebops.domain.Proposal;
import com.vebops.domain.enums.DocumentEntityType;
import com.vebops.domain.enums.DocumentKind;
import com.vebops.domain.enums.ProposalStatus;
import com.vebops.exception.BusinessException;
import com.vebops.exception.NotFoundException;
import com.vebops.repository.DocumentRepository;
import com.vebops.repository.ProposalRepository;

@Service
public class ProposalApprovalService {

    private final ProposalRepository proposals;
    private final DocumentRepository documents;
    private final FileStorageService storage;
    private final TimelineService timeline;
    private final ProposalService proposalService; // <- use existing approval flow

    public ProposalApprovalService(
        ProposalRepository proposals,
        DocumentRepository documents,
        FileStorageService storage,
        TimelineService timeline,
        ProposalService proposalService
    ) {
        this.proposals = proposals;
        this.documents = documents;
        this.storage = storage;
        this.timeline = timeline;
        this.proposalService = proposalService;
    }

    /**
     * Approve a proposal from the customer portal.
     * - Optional PO upload is stored as a Document(PDF) on the proposal
     * - Delegates the actual approval to ProposalService.approve(…)
     */
    @Transactional
    public Proposal approveByCustomer(Long tenantId,
                                      Long proposalId,
                                      Long customerId,
                                      String poNumber,
                                      String note,
                                      MultipartFile poFile) {
        Proposal p = proposals.findByTenantIdAndId(tenantId, proposalId)
            .orElseThrow(() -> new NotFoundException("Proposal not found"));

        // Sanity / ownership checks
        Customer c = p.getCustomer();
        if (c == null || !c.getTenantId().equals(tenantId)) {
            throw new BusinessException("Access denied for this proposal");
        }
        if (customerId != null && !c.getId().equals(customerId)) {
            throw new BusinessException("Not your proposal");
        }

        if (p.getStatus() == ProposalStatus.APPROVED) {
            // Idempotent return if already approved
            return p;
        }
        if (p.getStatus() != ProposalStatus.SENT) {
            throw new BusinessException("Only SENT proposals can be approved");
        }

        // Optional: store uploaded PO as a Document (PDF)
        String poUrl = null;
        if (poFile != null && !poFile.isEmpty()) {
            Document d = new Document();
            d.setTenantId(tenantId);
            d.setEntityType(DocumentEntityType.PROPOSAL);
            d.setEntityId(proposalId);
            d.setKind(DocumentKind.PDF);
            d.setUploadedAt(Instant.now());
            documents.saveAndFlush(d); // need ID for storage path + URL

            try {
                String savedName = storage.saveProposalDoc(tenantId, proposalId, d.getId(), poFile);
                d.setFilename(savedName);
                // customer-side download endpoint already exists in CustomerController
                d.setUrl(String.format("/customer/proposals/%d/documents/%d/download", proposalId, d.getId()));
                documents.save(d);
                poUrl = d.getUrl();
            } catch (Exception e) {
                throw new BusinessException("Failed to store PO file");
            }
        }

        // Timeline note for the approval intent (including optional freeform note)
        String msg = (note == null || note.isBlank())
                ? "Customer approved the proposal"
                : "Customer approved the proposal. Note: " + note;
        timeline.logProposalEvent(tenantId, proposalId, "APPROVED_BY_CUSTOMER", msg);

        // Delegate the heavy-lifting to the central ProposalService:
        // - sets status/approvedAt
        // - creates CustomerPO (using poNumber & poUrl)
        // - creates SR + WO and auto-assigns if needed
        Proposal saved = proposalService.approve(tenantId, proposalId, null /* approvedByUserId */, poNumber, poUrl);

        // Final timeline entry just in case (SR/WO creation is handled in ProposalService)
        timeline.logProposalEvent(tenantId, proposalId, "APPROVAL_COMPLETE",
                "Proposal approval flow completed via customer portal");

        return saved;
    }
}
