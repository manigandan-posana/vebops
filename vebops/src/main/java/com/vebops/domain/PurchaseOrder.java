package com.vebops.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Purchase orders raised by the back office to source material from
 * suppliers. The entity deliberately denormalises the party details so
 * each purchase order captures the exact snapshot that was shared with
 * the vendor (address, GST, contact information, etc.).
 */
@Entity
@Table(name = "purchase_orders",
    indexes = {
        @Index(name = "idx_po_tenant", columnList = "tenant_id"),
        @Index(name = "idx_po_service", columnList = "service_id")
    }
)
public class PurchaseOrder extends BaseTenantEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id")
    private Service service;

    @Column(length = 64)
    private String voucherNumber;

    @Column(name = "order_date")
    private LocalDate orderDate;

    // Buyer (Invoice To)
    @Column(length = 128)
    private String buyerName;
    @Column(length = 256)
    private String buyerAddress;
    @Column(length = 32)
    private String buyerPhone;
    @Column(length = 32)
    private String buyerGstin;
    @Column(length = 96)
    private String buyerStateName;
    @Column(length = 16)
    private String buyerStateCode;
    @Column(length = 160)
    private String buyerEmail;
    @Column(length = 160)
    private String buyerWebsite;

    // Supplier (Bill From)
    @Column(length = 160)
    private String supplierName;
    @Column(length = 256)
    private String supplierAddress;
    @Column(length = 32)
    private String supplierGstin;
    @Column(length = 96)
    private String supplierStateName;
    @Column(length = 16)
    private String supplierStateCode;
    @Column(length = 160)
    private String supplierEmail;
    @Column(length = 32)
    private String supplierWhatsapp;

    // Order meta information
    @Column(length = 160)
    private String referenceNumberAndDate;
    @Column(length = 160)
    private String paymentTerms;
    @Column(length = 160)
    private String dispatchedThrough;
    @Column(length = 160)
    private String destination;
    @Column(length = 160)
    private String otherReferences;
    @Column(length = 160)
    private String termsOfDelivery;

    // Totals
    @Column(precision = 18, scale = 2)
    private BigDecimal subTotal;
    @Column(precision = 6, scale = 2)
    private BigDecimal cgstRate;
    @Column(precision = 18, scale = 2)
    private BigDecimal cgstAmount;
    @Column(precision = 6, scale = 2)
    private BigDecimal sgstRate;
    @Column(precision = 18, scale = 2)
    private BigDecimal sgstAmount;
    @Column(precision = 18, scale = 2)
    private BigDecimal grandTotal;

    @Column(length = 256)
    private String amountInWords;
    @Column(length = 32)
    private String companyPan;

    public Service getService() { return service; }
    public void setService(Service service) { this.service = service; }

    public String getVoucherNumber() { return voucherNumber; }
    public void setVoucherNumber(String voucherNumber) { this.voucherNumber = voucherNumber; }

    public LocalDate getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDate orderDate) { this.orderDate = orderDate; }

    public String getBuyerName() { return buyerName; }
    public void setBuyerName(String buyerName) { this.buyerName = buyerName; }

    public String getBuyerAddress() { return buyerAddress; }
    public void setBuyerAddress(String buyerAddress) { this.buyerAddress = buyerAddress; }

    public String getBuyerPhone() { return buyerPhone; }
    public void setBuyerPhone(String buyerPhone) { this.buyerPhone = buyerPhone; }

    public String getBuyerGstin() { return buyerGstin; }
    public void setBuyerGstin(String buyerGstin) { this.buyerGstin = buyerGstin; }

    public String getBuyerStateName() { return buyerStateName; }
    public void setBuyerStateName(String buyerStateName) { this.buyerStateName = buyerStateName; }

    public String getBuyerStateCode() { return buyerStateCode; }
    public void setBuyerStateCode(String buyerStateCode) { this.buyerStateCode = buyerStateCode; }

    public String getBuyerEmail() { return buyerEmail; }
    public void setBuyerEmail(String buyerEmail) { this.buyerEmail = buyerEmail; }

    public String getBuyerWebsite() { return buyerWebsite; }
    public void setBuyerWebsite(String buyerWebsite) { this.buyerWebsite = buyerWebsite; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getSupplierAddress() { return supplierAddress; }
    public void setSupplierAddress(String supplierAddress) { this.supplierAddress = supplierAddress; }

    public String getSupplierGstin() { return supplierGstin; }
    public void setSupplierGstin(String supplierGstin) { this.supplierGstin = supplierGstin; }

    public String getSupplierStateName() { return supplierStateName; }
    public void setSupplierStateName(String supplierStateName) { this.supplierStateName = supplierStateName; }

    public String getSupplierStateCode() { return supplierStateCode; }
    public void setSupplierStateCode(String supplierStateCode) { this.supplierStateCode = supplierStateCode; }

    public String getSupplierEmail() { return supplierEmail; }
    public void setSupplierEmail(String supplierEmail) { this.supplierEmail = supplierEmail; }

    public String getSupplierWhatsapp() { return supplierWhatsapp; }
    public void setSupplierWhatsapp(String supplierWhatsapp) { this.supplierWhatsapp = supplierWhatsapp; }

    public String getReferenceNumberAndDate() { return referenceNumberAndDate; }
    public void setReferenceNumberAndDate(String referenceNumberAndDate) { this.referenceNumberAndDate = referenceNumberAndDate; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }

    public String getDispatchedThrough() { return dispatchedThrough; }
    public void setDispatchedThrough(String dispatchedThrough) { this.dispatchedThrough = dispatchedThrough; }

    public String getDestination() { return destination; }
    public void setDestination(String destination) { this.destination = destination; }

    public String getOtherReferences() { return otherReferences; }
    public void setOtherReferences(String otherReferences) { this.otherReferences = otherReferences; }

    public String getTermsOfDelivery() { return termsOfDelivery; }
    public void setTermsOfDelivery(String termsOfDelivery) { this.termsOfDelivery = termsOfDelivery; }

    public BigDecimal getSubTotal() { return subTotal; }
    public void setSubTotal(BigDecimal subTotal) { this.subTotal = subTotal; }

    public BigDecimal getCgstRate() { return cgstRate; }
    public void setCgstRate(BigDecimal cgstRate) { this.cgstRate = cgstRate; }

    public BigDecimal getCgstAmount() { return cgstAmount; }
    public void setCgstAmount(BigDecimal cgstAmount) { this.cgstAmount = cgstAmount; }

    public BigDecimal getSgstRate() { return sgstRate; }
    public void setSgstRate(BigDecimal sgstRate) { this.sgstRate = sgstRate; }

    public BigDecimal getSgstAmount() { return sgstAmount; }
    public void setSgstAmount(BigDecimal sgstAmount) { this.sgstAmount = sgstAmount; }

    public BigDecimal getGrandTotal() { return grandTotal; }
    public void setGrandTotal(BigDecimal grandTotal) { this.grandTotal = grandTotal; }

    public String getAmountInWords() { return amountInWords; }
    public void setAmountInWords(String amountInWords) { this.amountInWords = amountInWords; }

    public String getCompanyPan() { return companyPan; }
    public void setCompanyPan(String companyPan) { this.companyPan = companyPan; }
}
