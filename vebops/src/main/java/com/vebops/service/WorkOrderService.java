package com.vebops.service;

import java.math.BigDecimal;
import com.vebops.domain.WorkOrder;

public interface WorkOrderService {
    record ProgressAttachment(String filename, String contentType, Long size, byte[] data) {
        public boolean hasContent() {
            return data != null && data.length > 0;
        }
    }

    WorkOrder createForServiceRequest(Long tenantId, Long srId);
    void autoAssignIfInstallation(Long tenantId, Long woId);
    void issueItem(Long tenantId, Long woId, Long itemId, Long storeId, BigDecimal qty);
    default void addProgress(Long tenantId, Long woId, String status, Long byFeId, String remarks, String photoUrl) {
        addProgress(tenantId, woId, status, byFeId, remarks, photoUrl, null);
    }
    void addProgress(Long tenantId, Long woId, String status, Long byFeId, String remarks, String photoUrl, ProgressAttachment attachment);
    void complete(Long tenantId, Long woId);
    void assignFe(Long tenantId, Long woId, Long feId, String note);
    void returnItem(Long tenantId, Long woId, Long itemId, Long storeId, java.math.BigDecimal qty);

}
