package com.vebops.web;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.vebops.domain.WorkOrder;
import com.vebops.dto.FeDashboardSummary;
import com.vebops.dto.ProgressRequest;
import com.vebops.service.FeService;

/**
 * Thin controller delegating field engineer operations to {@link FeService}.
 * Business logic and transactional boundaries reside in the service layer.
 */
@RestController
@RequestMapping("/fe")
@Validated
@PreAuthorize("hasRole('FE')")
public class FEController {

    private final FeService svc;

    public FEController(FeService svc) {
        this.svc = svc;
    }

    // change the endpoint to accept optional feId and fallback to current user
    @GetMapping("/assigned")
    public ResponseEntity<List<WorkOrder>> assigned(@RequestParam(required = false) Long feId) {
        return (feId == null) ? svc.assignedForCurrentUser() : svc.assigned(feId);
    }

    @GetMapping("/dashboard")
    public ResponseEntity<FeDashboardSummary> dashboard() {
        return svc.dashboard();
    }

    @GetMapping("/wo/{id}")
    public ResponseEntity<FeService.FeWorkOrderDetail> detail(@PathVariable Long id) {
        return svc.detail(id);
    }


    @PostMapping("/wo/{woId}/progress")
    public ResponseEntity<Void> progress(@PathVariable Long woId, @RequestBody ProgressRequest req) {
        return svc.progress(woId, req);
    }

    @GetMapping(value = "/wo/{id}/completion-report.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> completionReport(@PathVariable Long id) {
        return svc.completionReport(id);
    }

    @GetMapping("/wo/{woId}/progress/{progressId}/attachments/{attachmentId}")
    public ResponseEntity<byte[]> downloadProgressAttachment(@PathVariable Long woId,
                                                              @PathVariable Long progressId,
                                                              @PathVariable Long attachmentId) {
        return svc.downloadProgressAttachment(woId, progressId, attachmentId);
    }
}
