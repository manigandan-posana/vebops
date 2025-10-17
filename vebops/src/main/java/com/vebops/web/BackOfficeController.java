package com.vebops.web;

import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.vebops.domain.Document;
import com.vebops.domain.Invoice;
import com.vebops.domain.Item;
import com.vebops.domain.ItemStock;
import com.vebops.domain.Kit;
import com.vebops.domain.Proposal;
import com.vebops.domain.ServiceRequest;
import com.vebops.domain.StockLedger;
import com.vebops.domain.Store;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.enums.FEStatus;
import com.vebops.domain.enums.ProposalStatus;
import com.vebops.domain.enums.SRStatus;
import com.vebops.domain.enums.ServiceTypeCode;
import com.vebops.domain.enums.WOStatus;
import com.vebops.dto.AddKitItemRequest;
import com.vebops.dto.ApproveProposalRequest;
import com.vebops.dto.AssignFERequest;
import com.vebops.dto.CreateCustomerRequest;
import com.vebops.dto.CreateCustomerResponse;
import com.vebops.dto.CreateFERequest;
import com.vebops.dto.CreateItemRequest;
import com.vebops.dto.CreateKitRequest;
import com.vebops.dto.CreateStoreRequest;
import com.vebops.dto.CustomerDto;
import com.vebops.dto.DraftFromKitRequest;
import com.vebops.dto.FieldEngineerDto;
import com.vebops.dto.IssueItemRequest;
import com.vebops.dto.ProgressRequest;
import com.vebops.dto.ProposalShareRequest;
import com.vebops.dto.ReceiveStockRequest;
import com.vebops.dto.ReturnItemRequest;
import com.vebops.dto.SendInvoiceRequest;
import com.vebops.dto.UpdateCustomerRequest;
import com.vebops.dto.UpdateFERequest;
import com.vebops.dto.UploadDocumentRequest;
import com.vebops.dto.UploadPORequest;
import com.vebops.dto.admin.AdminActivityItem;
import com.vebops.service.BackOfficeService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Thin REST controller delegating back office operations to {@link BackOfficeService}.
 * All business logic and transactional boundaries reside in the service layer.
 */
@RestController
@RequestMapping("/office")
@Validated
@PreAuthorize("hasAnyRole('BACK_OFFICE','ADMIN')")
public class BackOfficeController {

    private final BackOfficeService bo;
    

    public BackOfficeController(BackOfficeService bo) {
        this.bo = bo;
    }

    // ----- Intake -----
    @PostMapping("/intake/call")
    public ResponseEntity<Long> intakeCall(
            @RequestParam @NotBlank String customerName,
            @RequestParam(required = false) @Email String email,
            @RequestParam(required = false) String mobile,
            @RequestParam(required = false) String address,
            @RequestParam ServiceTypeCode serviceType,
            @RequestParam(required = false) String serviceHint) {
        return bo.intakeCall(customerName, email, mobile, address, serviceType, serviceHint);
    }

    // ----- Customers -----
    @PostMapping("/customers")
    public ResponseEntity<CreateCustomerResponse> createCustomer(@Valid @RequestBody CreateCustomerRequest req) {
        return bo.createCustomer(req);
    }

    @GetMapping({"/customer","/customers"})
    public ResponseEntity<Page<CustomerDto>> listCustomers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String mobile,
            @RequestParam(required = false) Boolean hasPortal,
            @PageableDefault(size = 25, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return bo.listCustomers(name, email, mobile, hasPortal, pageable);
    }

    @PutMapping("/customers/{id}")
    public ResponseEntity<CustomerDto> updateCustomer(@PathVariable Long id, @Valid @RequestBody UpdateCustomerRequest body) {
        return bo.updateCustomer(id, body);
    }

    @DeleteMapping("/customers/{id}")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id,
            @RequestParam(name = "deletePortalUserIfOrphan", defaultValue = "true") boolean deletePortalUserIfOrphan) {
        return bo.deleteCustomer(id, deletePortalUserIfOrphan);
    }

    // ----- Field Engineers -----
    @PostMapping("/field-engineers")
    public ResponseEntity<Long> createFE(@Valid @RequestBody CreateFERequest req) {
        return bo.createFE(req);
    }

    @GetMapping("/field-engineers")
    public ResponseEntity<Page<FieldEngineerDto>> listFieldEngineers(
            @RequestParam(required = false) FEStatus status,
            @PageableDefault(size = 20, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return bo.listFieldEngineers(status, pageable);
    }

    @PutMapping("/field-engineers/{id}")
    public ResponseEntity<Void> updateFieldEngineer(@PathVariable Long id, @RequestBody UpdateFERequest req) {
        return bo.updateFieldEngineer(id, req);
    }

    @DeleteMapping("/field-engineers/{id}")
    public ResponseEntity<Void> deleteFieldEngineer(
            @PathVariable Long id,
            @RequestParam(name = "deleteUserIfOrphan", defaultValue = "true") boolean deleteUserIfOrphan) {
        return bo.deleteFieldEngineer(id, deleteUserIfOrphan);
    }

    // ----- Service Requests -----
    @GetMapping({"/requests","/service-requests"})
    public ResponseEntity<List<ServiceRequest>> listServiceRequests(
            @RequestParam(required = false) SRStatus status,
            @RequestParam(name = "customerId", required = false) Long customerId,
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        return bo.listServiceRequests(status, customerId, page, size, sort);
    }

    @GetMapping({"/requests/{id}","/service-requests/{id}"})
    public ResponseEntity<ServiceRequest> getServiceRequest(@PathVariable Long id) {
        return bo.getServiceRequest(id);
    }

    @PostMapping({"/requests/{id}/create-wo","/service-requests/{id}/create-wo"})
    public ResponseEntity<Long> createWorkOrderFromRequest(@PathVariable Long id) {
        return bo.createWorkOrderFromRequest(id);
    }

    // ----- Proposals -----
    @GetMapping("/proposals")
    public ResponseEntity<List<Proposal>> listProposals(
            @RequestParam(required = false) ProposalStatus status,
            @RequestParam(required = false) Long customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "id,desc") String sort) {
        return bo.listProposals(status, customerId, page, size, sort);
    }

    @GetMapping("/proposals/{id}")
    public ResponseEntity<Map<String, Object>> getProposal(@PathVariable Long id) {
        return bo.getProposal(id);
    }

    @PostMapping("/proposals/{id}/po")
    public ResponseEntity<Void> uploadProposalPO(@PathVariable Long id, @RequestBody @Valid UploadPORequest body) {
        return bo.uploadProposalPO(id, body);
    }

    @GetMapping("/proposals/summary")
    public ResponseEntity<Map<String, Long>> proposalsSummary() {
        return bo.proposalsSummary();
    }

    @PostMapping("/proposals/from-kit")
    public ResponseEntity<Proposal> draftProposal(@RequestBody DraftFromKitRequest req) {
        return bo.draftProposal(req);
    }

    @PostMapping("/proposals/{id}/send")
    public ResponseEntity<Proposal> sendProposal(@PathVariable Long id, @RequestBody ProposalShareRequest share) {
        return bo.sendProposal(id, share);
    }

    @PostMapping("/proposals/{id}/approve")
    public ResponseEntity<Proposal> approveProposal(@PathVariable Long id, @RequestBody ApproveProposalRequest body) {
        return bo.approveProposal(id, body);
    }

    @PostMapping("/proposals/{id}/reject")
    public ResponseEntity<Void> rejectProposal(@PathVariable Long id) {
        return bo.rejectProposal(id);
    }

    // ----- Work Orders -----
    @GetMapping("/wo")
    public ResponseEntity<List<WorkOrder>> listWOs(
            @RequestParam(required = false) WOStatus status,
            @RequestParam(required = false) Long feId,
            @RequestParam(required = false) Long srId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(defaultValue = "id,desc") String sort) {
        return bo.listWOs(status, feId, srId, page, size, sort);
    }

    @GetMapping("/wo/{id}")
    public ResponseEntity<WorkOrder> getWO(@PathVariable Long id) {
        return bo.getWO(id);
    }

    @GetMapping("/wo/{id}/timeline")
    public ResponseEntity<Map<String, Object>> woTimeline(@PathVariable Long id) {
        return bo.woTimeline(id);
    }

    @PostMapping("/wo/{id}/assign")
    public ResponseEntity<Void> assignFe(@PathVariable Long id, @RequestBody @Valid AssignFERequest body) {
        return bo.assignFe(id, body);
    }

    @PostMapping("/wo/{id}/progress")
    public ResponseEntity<Void> addProgress(@PathVariable Long id, @RequestBody @Valid ProgressRequest req) {
        return bo.addProgress(id, req);
    }

    @GetMapping("/wo/summary")
    public ResponseEntity<Map<String, Long>> woSummary() {
        return bo.woSummary();
    }


    @PostMapping("/wo/{woId}/complete")
    public ResponseEntity<Void> complete(@PathVariable Long woId) {
        return bo.complete(woId);
    }

    // ----- Invoices -----
    @PostMapping("/invoice/{invoiceId}/send")
    public ResponseEntity<Void> sendInvoice(@PathVariable Long invoiceId, @RequestBody SendInvoiceRequest req) {
        return bo.sendInvoice(invoiceId, req);
    }

    // ----- Intake via email -----
    @PostMapping("/intake/email")
    public ResponseEntity<Long> intakeEmail(@RequestBody String rawEmail) {
        return bo.intakeEmail(rawEmail);
    }

    // ----- Inventory browse -----
    @GetMapping("/stores")
    public ResponseEntity<List<Store>> listStores() {
        return bo.listStores();
    }

    @GetMapping("/stocks")
    public ResponseEntity<List<ItemStock>> listStocks(@RequestParam(required = false) Long itemId,
                                                     @RequestParam(required = false) Long storeId) {
        return bo.listStocks(itemId, storeId);
    }


    // ----- Items -----
    @PostMapping("/items")
    public ResponseEntity<Long> createItem(@RequestBody CreateItemRequest req) {
        return bo.createItem(req);
    }

    // ----- Stores -----
    @PostMapping("/stores")
    public ResponseEntity<Long> createStore(@RequestBody CreateStoreRequest req) {
        return bo.createStore(req);
    }

    // ----- Kits -----
    @PostMapping("/kits")
    public ResponseEntity<Long> createKit(@RequestBody CreateKitRequest req) {
        return bo.createKit(req);
    }

    @PostMapping("/kits/items")
    public ResponseEntity<Long> addKitItem(@RequestBody AddKitItemRequest req) {
        return bo.addKitItem(req);
    }

    @GetMapping("/items")
    public List<Item> listItems(@RequestParam Long tenantId) {
        return bo.listItems(tenantId);
    }

    @GetMapping("/kits")
    public List<Kit> listKits(@RequestParam Long tenantId) {
        return bo.listKits(tenantId);
    }

    // ----- Recent Activity -----
    @GetMapping("/activity")
    @PreAuthorize("hasAnyRole('BACK_OFFICE','ADMIN')")
    public ResponseEntity<List<AdminActivityItem>> recentActivity(
            @RequestParam(name = "limit", defaultValue = "10") int limit) {
        return bo.recentActivity(limit);
    }

    // ----- Tenant user reset password -----
    @PostMapping("/users/{id}/reset-password")
    public Map<String, String> resetPasswordForTenantUser(
            @PathVariable Long id,
            @RequestParam(name = "sendEmail", defaultValue = "true") boolean sendEmail) {
        return bo.resetPasswordForTenantUser(id, sendEmail);
    }

    @PostMapping("/stock/receive")
    @PreAuthorize("hasAnyRole('BACK_OFFICE','ADMIN')")
    public ResponseEntity<Void> receiveStock(@RequestBody ReceiveStockRequest req) {
        return bo.receiveStock(req);
    }

    @PostMapping("/wo/{woId}/issue")
    public ResponseEntity<Void> issueItem(@PathVariable Long woId, @RequestBody @Validated IssueItemRequest req) {
        return bo.issueItem(woId, req);
    }

    // NEW: return unused materials
    @PostMapping("/wo/{woId}/return")
    public ResponseEntity<Void> returnItem(@PathVariable Long woId, @RequestBody @Validated ReturnItemRequest req) {
        return bo.returnItem(woId, req);
    }

    @GetMapping("/ledger")
    public ResponseEntity<List<StockLedger>> listLedger(
            @RequestParam Long itemId,
            @RequestParam(required = false) Long storeId) {
        return bo.listLedger(itemId, storeId);
    }

    @PostMapping("/proposals/{id}/documents")
    public ResponseEntity<Document> attachProposalDoc(@PathVariable Long id,
            @RequestBody @Valid UploadDocumentRequest body) {
        return bo.attachProposalDocument(id, body);
    }

    @GetMapping("/proposals/{id}/documents")
    public ResponseEntity<List<Document>> listProposalDocs(@PathVariable Long id) {
        return bo.listProposalDocuments(id);
    }

    // MULTIPART upload (keeps the existing JSON POST as-is)
    @PostMapping(value = "/proposals/{id}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Document> attachProposalDocMultipart(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @RequestPart(value = "type", required = false) String type) {
        return bo.attachProposalDocumentFile(id, file, type);
    }

    // BLOB download
    @GetMapping(value="/proposals/{proposalId}/documents/{docId}/download",produces = org.springframework.http.MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Resource> downloadProposalDoc(
            @PathVariable Long proposalId,
            @PathVariable Long docId) {
            return bo.downloadProposalDocument(proposalId, docId);
    }

    // add mapping next to the other WO endpoints
    @GetMapping("/wo/{woId}/invoice")
    public ResponseEntity<Invoice> getInvoiceForWO(@PathVariable Long woId) {
        return bo.getInvoiceForWorkOrder(woId);
    }


}