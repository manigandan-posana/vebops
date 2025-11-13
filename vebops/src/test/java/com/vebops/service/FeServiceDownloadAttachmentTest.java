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
import com.vebops.domain.FieldEngineer;
import com.vebops.domain.User;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.domain.WorkOrderProgressAttachment;
import com.vebops.exception.BusinessException;
import com.vebops.repository.FieldEngineerRepository;
import com.vebops.repository.KitItemRepository;
import com.vebops.repository.ServiceRepository;
import com.vebops.repository.WorkOrderAssignmentRepository;
import com.vebops.repository.WorkOrderItemRepository;
import com.vebops.repository.WorkOrderProgressAttachmentRepository;
import com.vebops.repository.WorkOrderProgressRepository;
import com.vebops.repository.WorkOrderQueryRepository;
import com.vebops.repository.WorkOrderRepository;

class FeServiceDownloadAttachmentTest {

    private FeService service;
    private FieldEngineerRepository feRepository;
    private WorkOrderProgressAttachmentRepository attachmentRepository;

    @BeforeEach
    void setUp() {
        feRepository = mock(FieldEngineerRepository.class);
        attachmentRepository = mock(WorkOrderProgressAttachmentRepository.class);
        service = new FeService(
                mock(WorkOrderService.class),
                mock(WorkOrderQueryRepository.class),
                mock(WorkOrderRepository.class),
                mock(WorkOrderProgressRepository.class),
                mock(WorkOrderItemRepository.class),
                mock(WorkOrderAssignmentRepository.class),
                feRepository,
                mock(ServiceRepository.class),
                mock(KitItemRepository.class),
                attachmentRepository);

        TenantContext.setTenantId(1L);
        TenantContext.setUserId(10L);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void downloadProgressAttachmentReturnsBinaryPayloadForAssignedEngineer() {
        FieldEngineer fe = buildEngineer(1L, 10L);
        when(feRepository.findFirstByTenantIdAndUser_Id(1L, 10L)).thenReturn(Optional.of(fe));

        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(55L);
        workOrder.setTenantId(1L);
        workOrder.setAssignedFE(fe);

        WorkOrderProgress progress = new WorkOrderProgress();
        progress.setId(77L);
        progress.setTenantId(1L);
        progress.setWorkOrder(workOrder);

        WorkOrderProgressAttachment attachment = new WorkOrderProgressAttachment();
        attachment.setId(99L);
        attachment.setTenantId(1L);
        attachment.setProgress(progress);
        attachment.setFilename("install\"photo.png");
        attachment.setContentType("image/png");
        attachment.setData(new byte[] {1, 2, 3});

        when(attachmentRepository.findByTenantIdAndId(1L, 99L)).thenReturn(Optional.of(attachment));

        ResponseEntity<byte[]> response = service.downloadProgressAttachment(55L, 77L, 99L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("image/png", String.valueOf(response.getHeaders().getContentType()));
        assertEquals("inline; filename=\"install_photo.png\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
        assertArrayEquals(new byte[] {1, 2, 3}, response.getBody());
    }

    @Test
    void downloadProgressAttachmentRejectsUnassignedEngineer() {
        FieldEngineer currentEngineer = buildEngineer(1L, 10L);
        FieldEngineer otherEngineer = buildEngineer(2L, 11L);
        when(feRepository.findFirstByTenantIdAndUser_Id(1L, 10L)).thenReturn(Optional.of(currentEngineer));

        WorkOrder workOrder = new WorkOrder();
        workOrder.setId(55L);
        workOrder.setTenantId(1L);
        workOrder.setAssignedFE(otherEngineer);

        WorkOrderProgress progress = new WorkOrderProgress();
        progress.setId(77L);
        progress.setTenantId(1L);
        progress.setWorkOrder(workOrder);

        WorkOrderProgressAttachment attachment = new WorkOrderProgressAttachment();
        attachment.setId(99L);
        attachment.setTenantId(1L);
        attachment.setProgress(progress);
        attachment.setFilename("photo.png");
        attachment.setContentType("image/png");
        attachment.setData(new byte[] {4, 5});

        when(attachmentRepository.findByTenantIdAndId(1L, 99L)).thenReturn(Optional.of(attachment));

        assertThrows(BusinessException.class, () -> service.downloadProgressAttachment(55L, 77L, 99L));
    }

    private FieldEngineer buildEngineer(Long engineerId, Long userId) {
        FieldEngineer fe = new FieldEngineer();
        fe.setId(engineerId);
        fe.setTenantId(1L);
        User user = new User();
        user.setId(userId);
        user.setDisplayName("Engineer " + engineerId);
        fe.setUser(user);
        return fe;
    }
}

