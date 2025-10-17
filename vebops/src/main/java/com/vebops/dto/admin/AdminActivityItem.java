package com.vebops.dto.admin;

import java.time.Instant;

/** A simple, backend-driven activity feed row. */
public class AdminActivityItem {
    public String entity;        // "PROPOSAL" | "WORK_ORDER" | "INVOICE"
    public Long id;              // entity id
    public Long tenantId;
    public String tenantName;    // resolved via TenantRepository (best effort)
    public String status;        // entity status enum name
    public Instant timestamp;    // updatedAt
    public String event;         // free text summary, e.g., "WORK_ORDER COMPLETED"
}
