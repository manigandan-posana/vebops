package com.vebops.domain;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A simple Service entity representing a customer‑facing service
 * (installation, supply, etc.). It captures the buyer and consignee
 * information along with free‑form JSON blobs for items, meta and
 * totals. This approach makes it easy to evolve the shape of the
 * service payload without needing to alter the database schema.
 */
@Entity
@Table(name = "services", indexes = {
        @Index(name = "idx_service_tenant", columnList = "tenant_id"),
        @Index(name = "idx_service_created", columnList = "created_at")
})
public class Service extends BaseTenantEntity {

    // Buyer
    @Column(length = 128)
    private String buyerName;
    @Column(length = 32)
    private String buyerGst;
    @Column(length = 256)
    private String buyerAddress;
    @Column(length = 16)
    private String buyerPin;
    @Column(length = 64)
    private String buyerState;

    /**
     * Optional contact number or email for the buyer. This field is not
     * mandatory but allows downstream documents to include a point of
     * contact on invoices or service records.
     */
    @Column(length = 64)
    private String buyerContact;

    // Consignee
    @Column(length = 128)
    private String consigneeName;
    @Column(length = 32)
    private String consigneeGst;
    @Column(length = 256)
    private String consigneeAddress;
    @Column(length = 16)
    private String consigneePin;
    @Column(length = 64)
    private String consigneeState;

    // Raw JSON blobs capturing the remainder of the payload. These are
    // serialised/deserialised by the controller using Jackson. Storing
    // arbitrary JSON allows for flexible schema on the front‑end while
    // keeping the persistence model simple.
    @Lob
    @Column(columnDefinition = "TEXT")
    private String itemsJson;
    @Lob
    @Column(columnDefinition = "TEXT")
    private String metaJson;
    @Lob
    @Column(columnDefinition = "TEXT")
    private String totalsJson;

    @Column(length = 190)
    private String buyerEmail; 

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public String getBuyerName() { return buyerName; }
    public void setBuyerName(String buyerName) { this.buyerName = buyerName; }
    public String getBuyerGst() { return buyerGst; }
    public void setBuyerGst(String buyerGst) { this.buyerGst = buyerGst; }
    public String getBuyerAddress() { return buyerAddress; }
    public void setBuyerAddress(String buyerAddress) { this.buyerAddress = buyerAddress; }
    public String getBuyerPin() { return buyerPin; }
    public void setBuyerPin(String buyerPin) { this.buyerPin = buyerPin; }
    public String getBuyerState() { return buyerState; }
    public void setBuyerState(String buyerState) { this.buyerState = buyerState; }

    public String getBuyerContact() { return buyerContact; }
    public void setBuyerContact(String buyerContact) { this.buyerContact = buyerContact; }

    public String getConsigneeName() { return consigneeName; }
    public void setConsigneeName(String consigneeName) { this.consigneeName = consigneeName; }
    public String getConsigneeGst() { return consigneeGst; }
    public void setConsigneeGst(String consigneeGst) { this.consigneeGst = consigneeGst; }
    public String getConsigneeAddress() { return consigneeAddress; }
    public void setConsigneeAddress(String consigneeAddress) { this.consigneeAddress = consigneeAddress; }
    public String getConsigneePin() { return consigneePin; }
    public void setConsigneePin(String consigneePin) { this.consigneePin = consigneePin; }
    public String getConsigneeState() { return consigneeState; }
    public void setConsigneeState(String consigneeState) { this.consigneeState = consigneeState; }

    public String getItemsJson() { return itemsJson; }
    public void setItemsJson(String itemsJson) { this.itemsJson = itemsJson; }
    public String getMetaJson() { return metaJson; }
    public void setMetaJson(String metaJson) { this.metaJson = metaJson; }
    public String getTotalsJson() { return totalsJson; }
    public void setTotalsJson(String totalsJson) { this.totalsJson = totalsJson; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public String getBuyerEmail() { return buyerEmail; }
    public void setBuyerEmail(String buyerEmail) { this.buyerEmail = buyerEmail; }
}