package com.vebops.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;

import com.vebops.service.InventoryService;
import com.vebops.service.TenantGuard;
import com.vebops.util.AiWriter;
import com.vebops.service.EmailService;
import com.vebops.repository.*;
import com.vebops.domain.*;
import com.vebops.domain.enums.*;
import com.vebops.exception.*;
import java.util.List;

@Service
public class InventoryServiceImpl implements InventoryService {

    private final TenantGuard tenantGuard;
    private final ItemRepository itemRepo;
    private final StoreRepository storeRepo;
    private final ItemStockRepository stockRepo;
    private final StockLedgerRepository ledgerRepo;
    private final ProcurementRequestRepository prRepo;
    private final EmailService email;
    private final WorkOrderRepository woRepo;
    private final TenantRepository tenantRepo;

    public InventoryServiceImpl(TenantGuard tenantGuard,
                                ItemRepository itemRepo,
                                StoreRepository storeRepo,
                                ItemStockRepository stockRepo,
                                StockLedgerRepository ledgerRepo,
                                ProcurementRequestRepository prRepo,
                                EmailService email, WorkOrderRepository woRepo,TenantRepository tenantRepo) {
        this.tenantGuard = tenantGuard;
        this.itemRepo = itemRepo;
        this.storeRepo = storeRepo;
        this.stockRepo = stockRepo;
        this.ledgerRepo = ledgerRepo;
        this.prRepo = prRepo;
        this.email = email;
        this.woRepo = woRepo;
        this.tenantRepo = tenantRepo;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = InsufficientStockException.class)
    public void ensureStockOrRaiseProcurement(Long tenantId, Long itemId, Long storeId, BigDecimal qty, Long raisedFromWoId) {
        tenantGuard.assertActive(tenantId);
        ItemStock st = stockRepo.findByTenantIdAndItem_IdAndStore_Id(tenantId, itemId, storeId).orElse(null);
        BigDecimal onHand = st == null ? BigDecimal.ZERO : st.getQtyOnHand();

        if (onHand.compareTo(qty) < 0) {
            Item item = itemRepo.findById(itemId).orElseThrow(() -> new NotFoundException("Item not found"));

            // Try to rebalance from other stores before raising procurement
            BigDecimal deficit = qty.subtract(onHand);

            // All stocks for this item across stores
            java.util.List<ItemStock> others = stockRepo.findByTenantIdAndItem_Id(tenantId, itemId);
            // Remove target store (we're trying to fill it)
            others.removeIf(os -> os.getStore().getId().equals(storeId));

            for (ItemStock src : others) {
                if (deficit.compareTo(BigDecimal.ZERO) <= 0) break;
                if (src.getQtyOnHand().compareTo(BigDecimal.ZERO) <= 0) continue;

                BigDecimal move = src.getQtyOnHand().min(deficit);

                // Decrement source
                src.setQtyOnHand(src.getQtyOnHand().subtract(move));
                stockRepo.save(src);

                // Ensure destination stock row exists
                if (st == null) {
                    st = new ItemStock();
                    st.setTenantId(tenantId);
                    st.setItem(src.getItem());
                    st.setStore(storeRepo.findById(storeId).orElseThrow(() -> new NotFoundException("Store not found")));
                    st.setQtyOnHand(BigDecimal.ZERO);
                    st.setQtyReserved(BigDecimal.ZERO);
                    st = stockRepo.save(st);
                }

                // Increment destination
                st.setQtyOnHand(st.getQtyOnHand().add(move));
                stockRepo.save(st);

                // Ledger OUT @ source (TRANSFER)
                StockLedger ledOut = new StockLedger();
                ledOut.setTenantId(tenantId);
                ledOut.setItem(src.getItem());
                ledOut.setStore(src.getStore());
                ledOut.setTxType(TxType.OUT);
                ledOut.setRefType(RefType.TRANSFER);
                ledOut.setRefId(storeId); // destination store id
                ledOut.setQty(move);
                ledOut.setRate(src.getItem().getRate());
                ledOut.setBalanceAfter(src.getQtyOnHand());
                ledgerRepo.save(ledOut);

                // Ledger IN @ destination (TRANSFER)
                StockLedger ledIn = new StockLedger();
                ledIn.setTenantId(tenantId);
                ledIn.setItem(st.getItem());
                ledIn.setStore(st.getStore());
                ledIn.setTxType(TxType.IN);
                ledIn.setRefType(RefType.TRANSFER);
                ledIn.setRefId(src.getStore().getId()); // source store id
                ledIn.setQty(move);
                ledIn.setRate(st.getItem().getRate());
                ledIn.setBalanceAfter(st.getQtyOnHand());
                ledgerRepo.save(ledIn);

                deficit = deficit.subtract(move);
            }

            // If transfer satisfied demand, stop here (no PR)
            onHand = st == null ? BigDecimal.ZERO : st.getQtyOnHand();
            if (onHand.compareTo(qty) >= 0) {
                return;
            }

            
            ProcurementRequest pr = new ProcurementRequest();
            pr.setTenantId(tenantId);
            pr.setItem(item);
            pr.setQty(qty.subtract(onHand));
            pr.setStatus(ProcurementStatus.DRAFT);
            if (raisedFromWoId != null) {
                WorkOrder wo = woRepo.findById(raisedFromWoId).orElse(null);
                if (wo != null) {
                    pr.setRaisedFromWorkOrder(wo);
                    pr.setRequiredBy(wo.getDueDate()); // mirror any-store behavior
                } else {
                    // fallback if WO not found (should be rare)
                    WorkOrder woRef = new WorkOrder();
                    woRef.setId(raisedFromWoId);
                    pr.setRaisedFromWorkOrder(woRef);
                }
            }
            prRepo.save(pr);

            // Email procurement (AI-generated body using vars)
            String to = "manigandanposana@gmail.com"; // or from tenant settings
            email.send(
                tenantId,
                to,
                "Procurement Request: " + item.getCode() + " (" + pr.getQty() + " " + item.getUom() + ")",
                AiWriter.expand(
                    "Please arrange procurement for the following shortage:",
                    Map.of(
                        "item", item.getCode() + " - " + item.getName(),
                        "qty", pr.getQty(),
                        "uom", item.getUom(),
                        "woRef", raisedFromWoId == null ? "-" : ("WO#" + raisedFromWoId)
                    )
                ),
                "PROCUREMENT",
                pr.getId(),
                true
            );

            // Email notice (AI enhanced)
            String body = email.renderTemplate(tenantId, "PROCUREMENT_REQ",
                Map.of("item", item.getName(), "qty", pr.getQty(), "wan", raisedFromWoId), true);
            email.send(tenantId, "procurement@tenant.com", "Procurement Request - " + item.getName(),
                    body, "PROCUREMENT_REQUEST", pr.getId(), true);

            throw new InsufficientStockException(item.getCode(), qty, onHand);
        }
    }

    @Override
    @Transactional
    public void deduct(Long tenantId, Long itemId, Long storeId, BigDecimal qty, Long refWoId) {
        tenantGuard.assertActive(tenantId);
         ItemStock st = stockRepo.lockByTenantAndItemAndStore(tenantId, itemId, storeId)
         .orElseThrow(() -> new BusinessException("Stock not found"));

        if (st.getQtyOnHand().compareTo(qty) < 0) {
            Item item = st.getItem();
            throw new InsufficientStockException(item.getCode(), qty, st.getQtyOnHand());
        }
        
        st.setQtyOnHand(st.getQtyOnHand().subtract(qty));
         // consume reservation if present
        var newReserved = st.getQtyReserved().subtract(qty);
        if (newReserved.signum() < 0) newReserved = BigDecimal.ZERO;
        st.setQtyReserved(newReserved);
        stockRepo.save(st);

        StockLedger led = new StockLedger();
        led.setTenantId(tenantId);
        led.setItem(st.getItem());
        led.setStore(st.getStore());
        led.setTxType(TxType.OUT);
        led.setRefType(RefType.WO_ISSUE);
        led.setRefId(refWoId);
        led.setQty(qty);
        led.setRate(st.getItem().getRate());
        led.setBalanceAfter(st.getQtyOnHand());
        ledgerRepo.save(led);
    }


    
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = InsufficientStockException.class)
    public void ensureStockOrRaiseProcurementAnyStore(Long tenantId, Long itemId, BigDecimal qty, Long raisedFromWoId) {
        tenantGuard.assertActive(tenantId);
        List<ItemStock> stocks = stockRepo.findByTenantIdAndItem_Id(tenantId, itemId);
        BigDecimal onHand = stocks.stream().map(ItemStock::getQtyOnHand).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (onHand.compareTo(qty) < 0) {
            Item item = itemRepo.findById(itemId).orElseThrow(() -> new NotFoundException("Item not found"));
            ProcurementRequest pr = new ProcurementRequest();
            pr.setTenantId(tenantId);
            pr.setItem(item);
            pr.setQty(qty.subtract(onHand));
            pr.setStatus(ProcurementStatus.DRAFT);

            if (raisedFromWoId != null) {
                WorkOrder wo = woRepo.findById(raisedFromWoId).orElse(null);
                if (wo != null) {
                    pr.setRaisedFromWorkOrder(wo);
                    pr.setRequiredBy(wo.getDueDate()); // may be null
                }
            }
            prRepo.save(pr);

            // notify purchasing
            email.send(
                tenantId,
                "procurement@yourcompany.com",
                "Procurement Request: " + item.getCode() + " (" + pr.getQty() + " " + item.getUom() + ")",
                AiWriter.expand("Please arrange procurement for shortage of {{item}} ({{qty}} {{uom}}) ref WO {{woRef}}",
                    Map.of("item", item.getCode()+" - "+item.getName(), "qty", pr.getQty(), "uom", item.getUom(),
                        "woRef", raisedFromWoId == null ? "-" : ("WO#"+raisedFromWoId))),
                "PROCUREMENT_REQUEST", pr.getId(), true
            );

            throw new InsufficientStockException(item.getCode(), qty, onHand);
        }
    }

    @Override
    @Transactional
    public void receive(Long tenantId, Long itemId, Long storeId, BigDecimal qty, Long refProcId, BigDecimal unitCost) {
        tenantGuard.assertActive(tenantId);
        ItemStock st = stockRepo.lockByTenantAndItemAndStore(tenantId, itemId, storeId)
                .orElseGet(() -> {
                    ItemStock ns = new ItemStock();
                    ns.setTenantId(tenantId);
                    ns.setItem(itemRepo.findById(itemId).orElseThrow(() -> new NotFoundException("Item not found")));
                    ns.setStore(storeRepo.findById(storeId).orElseThrow(() -> new NotFoundException("Store not found")));
                    ns.setQtyOnHand(BigDecimal.ZERO);
                    ns.setQtyReserved(BigDecimal.ZERO);
                    return stockRepo.save(ns);
                });

        // Rolling average costing if configured
        Item item = st.getItem();
        if (item.getRateType() == RateType.AVG && unitCost != null) {
            BigDecimal oldQty = st.getQtyOnHand();
            BigDecimal oldAvg = item.getRate();
            BigDecimal newQty = qty;
            BigDecimal newAvg = (oldAvg.multiply(oldQty).add(unitCost.multiply(newQty)))
                    .divide(oldQty.add(newQty), java.math.RoundingMode.HALF_UP);
            item.setRate(newAvg);
            itemRepo.save(item);
        }

        st.setQtyOnHand(st.getQtyOnHand().add(qty));

        StockLedger led = new StockLedger();
        led.setTenantId(tenantId);
        led.setItem(st.getItem());
        led.setStore(st.getStore());
        led.setTxType(TxType.IN);
        led.setRefType(RefType.PO_RECEIPT);
        led.setRefId(refProcId);
        led.setQty(qty);
        led.setRate(unitCost); // capture cost on receipt
        led.setBalanceAfter(st.getQtyOnHand());
        ledgerRepo.save(led);

        if (refProcId != null) {
            ProcurementRequest pr = prRepo.findById(refProcId).orElse(null);
            if (pr != null) {
                pr.setStatus(ProcurementStatus.RECEIVED);
                prRepo.save(pr);
            }
        }
    }

    @Override
    @Transactional
    public void returnFromWorkOrder(Long tenantId, Long itemId, Long storeId, BigDecimal qty, Long refWoId) {
        tenantGuard.assertActive(tenantId);
        ItemStock st = stockRepo.lockByTenantAndItemAndStore(tenantId, itemId, storeId)
            .orElseThrow(() -> new BusinessException("Stock not found for return"));
        st.setQtyOnHand(st.getQtyOnHand().add(qty));
        stockRepo.save(st);
        StockLedger led = new StockLedger();
        led.setTenantId(tenantId);
        led.setItem(st.getItem());
        led.setStore(st.getStore());
        led.setTxType(TxType.IN);
        led.setRefType(RefType.WO_RETURN);
        led.setRefId(refWoId);
        led.setQty(qty);
        led.setRate(st.getItem().getRate()); // informational
        led.setBalanceAfter(st.getQtyOnHand());
        ledgerRepo.save(led);
    }

}
