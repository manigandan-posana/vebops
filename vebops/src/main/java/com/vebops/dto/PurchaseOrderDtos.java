package com.vebops.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Data transfer objects for purchase order create/list/send flows.
 */
public final class PurchaseOrderDtos {
    private PurchaseOrderDtos() {}

    public static class Party {
        public String name;
        public String address;
        public String phone;
        public String gstin;
        public String stateName;
        public String stateCode;
        public String email;
        public String website;
    }

    public static class Supplier {
        public String name;
        public String address;
        public String gstin;
        public String stateName;
        public String stateCode;
        public String email;
        public String whatsapp;
    }

    public static class Meta {
        public String referenceNumberAndDate;
        public String paymentTerms;
        public String dispatchedThrough;
        public String destination;
        public String otherReferences;
        public String termsOfDelivery;
    }

    public static class Item {
        public String description;
        public BigDecimal quantity;
        public String unit;
        public BigDecimal rate;
        public BigDecimal amount;
    }

    public static class Totals {
        public BigDecimal subTotal;
        public BigDecimal cgstRate;
        public BigDecimal cgstAmount;
        public BigDecimal sgstRate;
        public BigDecimal sgstAmount;
        public BigDecimal grandTotal;
    }

    public static class CreateRequest {
        public Long serviceId;
        public String voucherNumber;
        public String date; // ISO-8601 formatted date string
        public Party buyer;
        public Supplier supplier;
        public Meta meta;
        public List<Item> items = new ArrayList<>();
        public Totals totals;
        public String amountInWords;
        public String companyPan;
    }

    public static class SendRequest {
        public String toEmail;
        public String toWhatsapp;
    }

    public static class ListItem {
        public Long id;
        public String voucherNumber;
        public LocalDate date;
        public String supplierName;
        public String supplierEmail;
        public String supplierWhatsapp;
        public BigDecimal grandTotal;
        public Long serviceId;
        public String serviceWan;
        public String buyerName;
    }

    public static class Detail {
        public PurchaseOrderDtos.ListItem header;
        public PurchaseOrderDtos.Party buyer;
        public PurchaseOrderDtos.Supplier supplier;
        public PurchaseOrderDtos.Meta meta;
        public PurchaseOrderDtos.Totals totals;
        public String amountInWords;
        public String companyPan;
        public List<PurchaseOrderDtos.Item> items = new ArrayList<>();
    }
}
