package com.vebops.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.vebops.context.TenantContext;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.domain.WorkOrderProgressAttachment;
import com.vebops.exception.BusinessException;
import com.vebops.repository.CustomerPORepository;
import com.vebops.repository.CustomerRepository;
import com.vebops.repository.DocumentRepository;
import com.vebops.repository.EmailTemplateRepository;
import com.vebops.repository.FieldEngineerRepository;
import com.vebops.repository.InvoiceRepository;
import com.vebops.repository.ItemRepository;
import com.vebops.repository.ItemStockRepository;
import com.vebops.repository.KitItemRepository;
import com.vebops.repository.KitRepository;
import com.vebops.repository.PasswordResetTokenRepository;
import com.vebops.repository.ProposalItemRepository;
import com.vebops.repository.ProposalRepository;
import com.vebops.repository.PurchaseOrderLineRepository;
import com.vebops.repository.PurchaseOrderRepository;
import com.vebops.repository.ServiceRepository;
import com.vebops.repository.ServiceRequestRepository;
import com.vebops.repository.StockLedgerRepository;
import com.vebops.repository.StoreRepository;
import com.vebops.repository.TenantRepository;
import com.vebops.repository.UserRepository;
import com.vebops.repository.UserRoleRepository;
import com.vebops.repository.WorkOrderAssignmentRepository;
import com.vebops.repository.WorkOrderProgressAttachmentRepository;
import com.vebops.repository.WorkOrderProgressRepository;
import com.vebops.repository.WorkOrderQueryRepository;
import com.vebops.repository.WorkOrderRepository;
import com.vebops.service.DocumentSequenceService;
import com.vebops.service.EmailService;
import com.vebops.service.FileStorageService;
import com.vebops.service.InventoryService;
import com.vebops.service.PortalAccountManager;
import com.vebops.service.ProposalDocumentService;
import com.vebops.service.ProposalSharingService;
import com.vebops.service.TenantGuard;

import org.springframework.security.crypto.password.PasswordEncoder;

class BackOfficeServiceDownloadAttachmentTest {

    private BackOfficeService service;
    private WorkOrderProgressAttachmentRepository attachmentRepository;

    @BeforeEach
    void setUp() {
        attachmentRepository = mock(WorkOrderProgressAttachmentRepository.class);
        service = new BackOfficeService(
                mock(IntakeService.class),
                mock(ProposalService.class),
                mock(WorkOrderService.class),
                mock(InvoiceService.class),
                mock(ServiceRequestService.class),
                mock(CustomerRepository.class),
                mock(UserRepository.class),
                mock(FieldEngineerRepository.class),
                mock(UserRoleRepository.class),
                mock(PasswordEncoder.class),
                mock(StoreRepository.class),
                mock(ItemStockRepository.class),
                mock(StockLedgerRepository.class),
                mock(EmailService.class),
                mock(ItemRepository.class),
                mock(KitRepository.class),
                mock(KitItemRepository.class),
                mock(TenantRepository.class),
                mock(ProposalRepository.class),
                mock(WorkOrderRepository.class),
                mock(InvoiceRepository.class),
                mock(ProposalItemRepository.class),
                mock(CustomerPORepository.class),
                mock(PurchaseOrderRepository.class),
                mock(PurchaseOrderLineRepository.class),
                mock(WorkOrderAssignmentRepository.class),
                mock(WorkOrderProgressRepository.class),
                attachmentRepository,
                mock(WorkOrderQueryRepository.class),
                mock(PasswordResetTokenRepository.class),
                mock(ServiceRequestRepository.class),
                mock(ServiceRepository.class),
                mock(PortalAccountManager.class),
                mock(InventoryService.class),
                mock(DocumentSequenceService.class),
                mock(DocumentRepository.class),
                mock(FileStorageService.class),
                mock(ProposalDocumentService.class),
                mock(ProposalSharingService.class),
                mock(TenantGuard.class),
                mock(EmailTemplateRepository.class));

        TenantContext.setTenantId(1L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void downloadProgressAttachmentReturnsBinaryPayload() {
        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(501L);
        workOrder.setTenantId(1L);

        WorkOrderProgress progress = new WorkOrderProgress();
        progress.setId(701L);
        progress.setTenantId(1L);
        progress.setWorkOrder(workOrder);

        WorkOrderProgressAttachment attachment = new WorkOrderProgressAttachment();
        attachment.setId(801L);
        attachment.setTenantId(1L);
        attachment.setProgress(progress);
        attachment.setFilename("progress.jpg");
        attachment.setContentType("image/jpeg");
        attachment.setData(new byte[] {9, 8, 7});

        when(attachmentRepository.findByTenantIdAndId(1L, 801L)).thenReturn(Optional.of(attachment));

        ResponseEntity<byte[]> response = service.downloadProgressAttachment(501L, 701L, 801L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("image/jpeg", String.valueOf(response.getHeaders().getContentType()));
        assertEquals("inline; filename=\"progress.jpg\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
        assertArrayEquals(new byte[] {9, 8, 7}, response.getBody());
    }

    @Test
    void downloadProgressAttachmentRejectsWhenIdsDoNotMatch() {
        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(501L);
        workOrder.setTenantId(1L);

        WorkOrderProgress progress = new WorkOrderProgress();
        progress.setId(701L);
        progress.setTenantId(1L);
        progress.setWorkOrder(workOrder);

        WorkOrderProgressAttachment attachment = new WorkOrderProgressAttachment();
        attachment.setId(801L);
        attachment.setTenantId(1L);
        attachment.setProgress(progress);
        attachment.setFilename("progress.jpg");
        attachment.setContentType("image/jpeg");
        attachment.setData(new byte[] {9, 8, 7});

        when(attachmentRepository.findByTenantIdAndId(1L, 801L)).thenReturn(Optional.of(attachment));

        assertThrows(BusinessException.class, () -> service.downloadProgressAttachment(999L, 701L, 801L));
    }
}

