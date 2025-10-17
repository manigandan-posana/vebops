package com.vebops.dto.admin;

import java.math.BigDecimal;

public class AdminSummaryResponse {
    public long totalTenants;
    public long activeUsers;         // users.active == true
    public long signups30d;          // tenants created in last 30 days
    public Subscriptions subscriptions = new Subscriptions();
    public BigDecimal revenueMTD;    // sum of PAID invoices created this month

    public static class Subscriptions {
        public long active;
        public long inactive;
    }
}
