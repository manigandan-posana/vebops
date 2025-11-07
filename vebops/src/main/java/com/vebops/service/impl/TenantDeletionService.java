package com.vebops.service.impl;

import com.vebops.exception.NotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class TenantDeletionService {

    @PersistenceContext
    private EntityManager em;

    private long count(String sql, Long tid) {
        Object o = em.createNativeQuery(sql).setParameter("tid", tid).getSingleResult();
        return ((Number) o).longValue();
    }

    private int exec(String sql, Long tid) {
        return em.createNativeQuery(sql).setParameter("tid", tid).executeUpdate();
    }

    /** Read-only preview of rows that will be removed (useful in prod). */
    @Transactional(readOnly = true)
    public Map<String, Long> dryRun(Long tenantId) {
        ensureTenantExists(tenantId);
        Map<String, Long> m = new LinkedHashMap<>();

        // --- children first (mirror delete order) ---
        m.put("documents",              count("SELECT COUNT(*) FROM documents WHERE tenant_id=:tid", tenantId));
        m.put("email_log",              count("SELECT COUNT(*) FROM email_log WHERE tenant_id=:tid", tenantId));
        m.put("email_templates",        count("SELECT COUNT(*) FROM email_templates WHERE tenant_id=:tid", tenantId));
        m.put("team_members",           count("SELECT COUNT(*) FROM team_members WHERE tenant_id=:tid", tenantId));
        m.put("work_order_progress",    count("SELECT COUNT(*) FROM work_order_progress WHERE tenant_id=:tid", tenantId));
        m.put("work_order_assignments", count("SELECT COUNT(*) FROM work_order_assignments WHERE tenant_id=:tid", tenantId));
        m.put("work_order_items",       count("SELECT COUNT(*) FROM work_order_items WHERE tenant_id=:tid", tenantId));
        m.put("invoice_lines",          count("SELECT COUNT(*) FROM invoice_lines WHERE tenant_id=:tid", tenantId));
        m.put("procurement_requests",   count("SELECT COUNT(*) FROM procurement_requests WHERE tenant_id=:tid", tenantId));
        m.put("stock_ledger",           count("SELECT COUNT(*) FROM stock_ledger WHERE tenant_id=:tid", tenantId));
        m.put("item_stocks",            count("SELECT COUNT(*) FROM item_stocks WHERE tenant_id=:tid", tenantId));
        m.put("kit_items",              count("SELECT COUNT(*) FROM kit_items WHERE tenant_id=:tid", tenantId));
        m.put("proposal_items",         count("SELECT COUNT(*) FROM proposal_items WHERE tenant_id=:tid", tenantId));

        // --- parents of children ---
        m.put("invoices",               count("SELECT COUNT(*) FROM invoices WHERE tenant_id=:tid", tenantId));
        m.put("work_orders",            count("SELECT COUNT(*) FROM work_orders WHERE tenant_id=:tid", tenantId));
        m.put("service_requests",       count("SELECT COUNT(*) FROM service_requests WHERE tenant_id=:tid", tenantId));
        m.put("proposals",              count("SELECT COUNT(*) FROM proposals WHERE tenant_id=:tid", tenantId));
        m.put("customer_po",            count("SELECT COUNT(*) FROM customer_po WHERE tenant_id=:tid", tenantId));

        // --- independent parents ---
        m.put("teams",                  count("SELECT COUNT(*) FROM teams WHERE tenant_id=:tid", tenantId));
        m.put("field_engineers",        count("SELECT COUNT(*) FROM field_engineers WHERE tenant_id=:tid", tenantId));
        m.put("intakes",                count("SELECT COUNT(*) FROM intakes WHERE tenant_id=:tid", tenantId));
        m.put("stores",                 count("SELECT COUNT(*) FROM stores WHERE tenant_id=:tid", tenantId));
        m.put("kits",                   count("SELECT COUNT(*) FROM kits WHERE tenant_id=:tid", tenantId));
        m.put("items",                  count("SELECT COUNT(*) FROM items WHERE tenant_id=:tid", tenantId));
        m.put("customers",              count("SELECT COUNT(*) FROM customers WHERE tenant_id=:tid", tenantId));

        // --- tenant bindings & tenant row ---
        m.put("user_roles",             count("SELECT COUNT(*) FROM user_roles WHERE tenant_id=:tid", tenantId));
        m.put("subscriptions",          count("SELECT COUNT(*) FROM subscriptions WHERE tenant_id=:tid", tenantId));
        m.put("tenants",                count("SELECT COUNT(*) FROM tenants WHERE id=:tid", tenantId));

        // Heads-up count: users currently linked via FE/Customer portal for this tenant
        Object userCount = em.createNativeQuery("""
            SELECT COUNT(DISTINCT u.id)
            FROM users u
            JOIN (
                SELECT user_id AS uid FROM field_engineers WHERE tenant_id = :tid
                UNION
                SELECT user_id AS uid FROM customers WHERE tenant_id = :tid AND user_id IS NOT NULL
            ) t ON t.uid = u.id
        """).setParameter("tid", tenantId).getSingleResult();
        m.put("linked_users_candidates", ((Number) userCount).longValue());

        return m;
    }

    /** Hard delete tenant + all tenant-scoped data. Optional orphan user cleanup. */
    @Transactional
    public void purgeTenant(Long tenantId, boolean deleteOrphanUsers) {
        ensureTenantExists(tenantId);

        // Capture candidate user ids (FEs + portal customers for this tenant)
        @SuppressWarnings("unchecked")
        List<Number> candidates = em.createNativeQuery("""
            SELECT DISTINCT uid FROM (
                SELECT user_id AS uid FROM field_engineers WHERE tenant_id = :tid
                UNION
                SELECT user_id AS uid FROM customers WHERE tenant_id = :tid AND user_id IS NOT NULL
                UNION
                SELECT user_id AS uid FROM user_roles WHERE tenant_id = :tid
            ) x
        """).setParameter("tid", tenantId).getResultList();
        List<Long> candidateUserIds = new ArrayList<>();
        for (Number n : candidates) { if (n != null) candidateUserIds.add(n.longValue()); }

        // --- children first ---
        exec("DELETE FROM documents WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM email_log WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM email_templates WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM team_members WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM work_order_progress WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM work_order_assignments WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM work_order_items WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM invoice_lines WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM procurement_requests WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM stock_ledger WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM item_stocks WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM kit_items WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM proposal_items WHERE tenant_id=:tid", tenantId);

        // --- parents ---
        exec("DELETE FROM invoices WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM work_orders WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM service_requests WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM proposals WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM customer_po WHERE tenant_id=:tid", tenantId);

        exec("DELETE FROM teams WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM field_engineers WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM intakes WHERE tenant_id=:tid", tenantId);

        exec("DELETE FROM stores WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM kits WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM items WHERE tenant_id=:tid", tenantId);

        exec("DELETE FROM customers WHERE tenant_id=:tid", tenantId);

        exec("DELETE FROM user_roles WHERE tenant_id=:tid", tenantId);
        exec("DELETE FROM subscriptions WHERE tenant_id=:tid", tenantId);

        // --- finally the tenant row ---
        exec("DELETE FROM tenants WHERE id=:tid", tenantId);

        // Optional: strictly-safe cleanup of only now-orphaned users tied to this tenant
        if (deleteOrphanUsers && !candidateUserIds.isEmpty()) {
            // Remove reset tokens for these users first (avoid FK issues)
            var q1 = em.createNativeQuery("DELETE FROM password_reset_tokens WHERE user_id IN (:ids)");
            try {
                q1.unwrap(org.hibernate.query.NativeQuery.class).setParameterList("ids", candidateUserIds);
                q1.executeUpdate();
            } catch (Exception ignore) {
                for (Long id : candidateUserIds) {
                    em.createNativeQuery("DELETE FROM password_reset_tokens WHERE user_id = :uid")
                      .setParameter("uid", id).executeUpdate();
                }
            }

            String sql = """
                DELETE u FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN field_engineers fe ON fe.user_id = u.id
                LEFT JOIN customers c ON c.user_id = u.id
                WHERE ur.user_id IS NULL AND fe.user_id IS NULL AND c.user_id IS NULL
                AND u.id IN (:ids)
            """;
            var q = em.createNativeQuery(sql);
            try {
                q.unwrap(org.hibernate.query.NativeQuery.class).setParameterList("ids", candidateUserIds);
                q.executeUpdate();
            } catch (Exception ignore) {
                // fallback one-by-one with safety predicate
                for (Long id : candidateUserIds) {
                    em.createNativeQuery("""
                        DELETE u FROM users u
                        LEFT JOIN user_roles ur ON ur.user_id = u.id
                        LEFT JOIN field_engineers fe ON fe.user_id = u.id
                        LEFT JOIN customers c ON c.user_id = u.id
                        WHERE ur.user_id IS NULL AND fe.user_id IS NULL AND c.user_id IS NULL
                        AND u.id = :uid
                    """).setParameter("uid", id).executeUpdate();
                }
            }
        }

        // ---- FINAL SWEEP (global orphans) -----------------------------------------
        // Catch any users that became orphaned for any reason (including those deleted earlier)
        // This is safe because it only removes users with absolutely no references anywhere.
        if (deleteOrphanUsers) {
            // First: remove tokens for truly-orphan users (avoid FK issues)
            em.createNativeQuery("""
                DELETE prt FROM password_reset_tokens prt
                LEFT JOIN users u ON prt.user_id = u.id
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN field_engineers fe ON fe.user_id = u.id
                LEFT JOIN customers c ON c.user_id = u.id
                WHERE ur.user_id IS NULL AND fe.user_id IS NULL AND c.user_id IS NULL
            """).executeUpdate();

            // Then: delete the truly-orphan users
            em.createNativeQuery("""
                DELETE u FROM users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN field_engineers fe ON fe.user_id = u.id
                LEFT JOIN customers c ON c.user_id = u.id
                WHERE ur.user_id IS NULL AND fe.user_id IS NULL AND c.user_id IS NULL
            """).executeUpdate();
        }

    }

    private void ensureTenantExists(Long tenantId) {
        long c = count("SELECT COUNT(*) FROM tenants WHERE id=:tid", tenantId);
        if (c == 0) throw new NotFoundException("Tenant " + tenantId + " not found");
    }
}
