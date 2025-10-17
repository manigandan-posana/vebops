package com.vebops.service;

import java.math.BigDecimal;

public interface InventoryService {
    void ensureStockOrRaiseProcurement(Long tenantId, Long itemId, Long storeId, BigDecimal qty, Long raisedFromWoId);
    void deduct(Long tenantId, Long itemId, Long storeId, BigDecimal qty, Long refWoId);
    void receive(Long tenantId, Long itemId, Long storeId, BigDecimal qty, Long refProcId, BigDecimal unitCost);
    void ensureStockOrRaiseProcurementAnyStore(Long tenantId, Long itemId, BigDecimal qty, Long raisedFromWoId);
    // NEW: material return from WO
    void returnFromWorkOrder(Long tenantId, Long itemId, Long storeId, BigDecimal qty, Long refWoId);
}
