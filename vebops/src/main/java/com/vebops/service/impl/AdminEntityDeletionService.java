package com.vebops.service.impl;

import com.vebops.context.TenantContext;
import com.vebops.exception.NotFoundException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminEntityDeletionService {

    @PersistenceContext
    private EntityManager em;

    /* --------------------------- helpers --------------------------- */

    private long count(String sql, Long tid, Long id) {
        Object o = em.createNativeQuery(sql)
            .setParameter("tid", tid)
            .setParameter("id", id)
            .getSingleResult();
        return ((Number) o).longValue();
    }

    private int exec(String sql, Long tid, Long id) {
        return em.createNativeQuery(sql)
            .setParameter("tid", tid)
            .setParameter("id", id)
            .executeUpdate();
    }

    private void ensureCustomerExists(Long tenantId, Long customerId) {
        long c = count("SELECT COUNT(*) FROM customers WHERE tenant_id=:tid AND id=:id", tenantId, customerId);
        if (c == 0) throw new NotFoundException("Customer not found in this tenant");
    }

    private void ensureFEExists(Long tenantId, Long feId) {
        long c = count("SELECT COUNT(*) FROM field_engineers WHERE tenant_id=:tid AND id=:id", tenantId, feId);
        if (c == 0) throw new NotFoundException("Field Engineer not found in this tenant");
    }

    /* --------------------- delete CUSTOMER cascade --------------------- */

    /**
     * Deletes a customer and ONLY their data in this tenant:
     * - SR → WO → invoice graph (and child rows)
     * - proposal items, proposal docs, PO docs
     * - work order items/progress/assignments, SR/WO/INV/PROPOSAL/PO documents, invoice lines, email logs
     * - CUSTOMER role binding in this tenant
     * Preserves global users, other tenants, inventory, teams, FEs, etc.
     */
    @Transactional
    public void deleteCustomerCascade(Long customerId, boolean deletePortalUserIfOrphan) {
        final Long tid = TenantContext.getTenantId();
        ensureCustomerExists(tid, customerId);

        // Email logs tied to this customer’s invoices and proposals
        em.createNativeQuery("""
            DELETE FROM email_log
             WHERE tenant_id=:tid AND entity_type='INVOICE'
               AND entity_id IN (SELECT id FROM invoices WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        em.createNativeQuery("""
            DELETE FROM email_log
             WHERE tenant_id=:tid AND entity_type='PROPOSAL'
               AND entity_id IN (SELECT id FROM proposals WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        // Documents for INVOICE, WO, SR, PROPOSAL, PO
        em.createNativeQuery("""
            DELETE FROM documents
             WHERE tenant_id=:tid AND entity_type='INVOICE'
               AND entity_id IN (SELECT id FROM invoices WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        em.createNativeQuery("""
            DELETE FROM documents
             WHERE tenant_id=:tid AND entity_type='WO'
               AND entity_id IN (
                   SELECT id FROM work_orders
                    WHERE tenant_id=:tid
                      AND sr_id IN (SELECT id FROM service_requests WHERE tenant_id=:tid AND customer_id=:id)
               )
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        em.createNativeQuery("""
            DELETE FROM documents
             WHERE tenant_id=:tid AND entity_type='SR'
               AND entity_id IN (SELECT id FROM service_requests WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        em.createNativeQuery("""
            DELETE FROM documents
             WHERE tenant_id=:tid AND entity_type='PROPOSAL'
               AND entity_id IN (SELECT id FROM proposals WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        em.createNativeQuery("""
            DELETE FROM documents
             WHERE tenant_id=:tid AND entity_type='PO'
               AND entity_id IN (
                   SELECT id FROM customer_po
                    WHERE tenant_id=:tid
                      AND proposal_id IN (SELECT id FROM proposals WHERE tenant_id=:tid AND customer_id=:id)
               )
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        // Invoice lines
        em.createNativeQuery("""
            DELETE FROM invoice_lines
             WHERE tenant_id=:tid
               AND invoice_id IN (SELECT id FROM invoices WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        // WO children
        em.createNativeQuery("""
            DELETE FROM work_order_progress
             WHERE tenant_id=:tid
               AND wo_id IN (
                   SELECT id FROM work_orders WHERE tenant_id=:tid
                    AND sr_id IN (SELECT id FROM service_requests WHERE tenant_id=:tid AND customer_id=:id)
               )
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        em.createNativeQuery("""
            DELETE FROM work_order_assignments
             WHERE tenant_id=:tid
               AND wo_id IN (
                   SELECT id FROM work_orders WHERE tenant_id=:tid
                    AND sr_id IN (SELECT id FROM service_requests WHERE tenant_id=:tid AND customer_id=:id)
               )
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        em.createNativeQuery("""
            DELETE FROM work_order_items
             WHERE tenant_id=:tid
               AND wo_id IN (
                   SELECT id FROM work_orders WHERE tenant_id=:tid
                    AND sr_id IN (SELECT id FROM service_requests WHERE tenant_id=:tid AND customer_id=:id)
               )
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        // Proposal items
        em.createNativeQuery("""
            DELETE FROM proposal_items
             WHERE tenant_id=:tid
               AND proposal_id IN (SELECT id FROM proposals WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        // Parents
        exec("DELETE FROM invoices WHERE tenant_id=:tid AND customer_id=:id", tid, customerId);
        em.createNativeQuery("""
            DELETE FROM work_orders
             WHERE tenant_id=:tid
               AND sr_id IN (SELECT id FROM service_requests WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();
        exec("DELETE FROM service_requests WHERE tenant_id=:tid AND customer_id=:id", tid, customerId);
        exec("DELETE FROM proposals WHERE tenant_id=:tid AND customer_id=:id", tid, customerId);
        em.createNativeQuery("""
            DELETE FROM customer_po
             WHERE tenant_id=:tid
               AND proposal_id IN (SELECT id FROM proposals WHERE tenant_id=:tid AND customer_id=:id)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        // Remove CUSTOMER role binding (keep the global user)
        em.createNativeQuery("""
            DELETE FROM user_roles
             WHERE tenant_id=:tid AND role_code='CUSTOMER'
               AND user_id IN (SELECT user_id FROM customers WHERE tenant_id=:tid AND id=:id AND user_id IS NOT NULL)
        """).setParameter("tid", tid).setParameter("id", customerId).executeUpdate();

        // Finally the customer row
        exec("DELETE FROM customers WHERE tenant_id=:tid AND id=:id", tid, customerId);

        // Optional: prune the portal user ONLY if it is truly orphaned everywhere
        if (deletePortalUserIfOrphan) {
            // Which user?
            Object uid = em.createNativeQuery("""
                SELECT user_id FROM customers WHERE tenant_id=:tid AND id=:id
            """).setParameter("tid", tid).setParameter("id", customerId).getSingleResult();
            if (uid != null) {
                Long userId = ((Number) uid).longValue();
                // If the customer is already deleted, the select above may be null; handle safely:
                try {
                    // If no roles, no FE link, no Customer link anywhere → delete reset tokens + user
                    int roles = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM user_roles WHERE user_id=:u")
                        .setParameter("u", userId).getSingleResult()).intValue();
                    int fe = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM field_engineers WHERE user_id=:u")
                        .setParameter("u", userId).getSingleResult()).intValue();
                    int cust = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM customers WHERE user_id=:u")
                        .setParameter("u", userId).getSingleResult()).intValue();
                    if (roles == 0 && fe == 0 && cust == 0) {
                        em.createNativeQuery("DELETE FROM password_reset_tokens WHERE user_id=:u")
                          .setParameter("u", userId).executeUpdate();
                        em.createNativeQuery("DELETE FROM users WHERE id=:u")
                          .setParameter("u", userId).executeUpdate();
                    }
                } catch (Exception ignore) { /* safe best-effort */ }
            }
        }
    }

    /* --------------------- delete FIELD ENGINEER --------------------- */

    /**
     * Deletes a field engineer in this tenant:
     * - Nulls references in work_orders.assigned_fe_id and work_order_progress.by_fe_id
     * - Deletes work_order_assignments and team_members for this FE
     * - Removes FE role binding in this tenant
     * - Deletes the FE row
     * Preserves user (unless optional orphan cleanup is requested).
     */
    @Transactional
    public void deleteFieldEngineer(Long feId, boolean deleteUserIfOrphan) {
        final Long tid = TenantContext.getTenantId();
        ensureFEExists(tid, feId);

        // Clear references
        em.createNativeQuery("""
            UPDATE work_orders SET assigned_fe_id=NULL
             WHERE tenant_id=:tid AND assigned_fe_id=:id
        """).setParameter("tid", tid).setParameter("id", feId).executeUpdate();

        em.createNativeQuery("""
            UPDATE work_order_progress SET by_fe_id=NULL
             WHERE tenant_id=:tid AND by_fe_id=:id
        """).setParameter("tid", tid).setParameter("id", feId).executeUpdate();

        // Remove assignment rows and team membership
        exec("DELETE FROM work_order_assignments WHERE tenant_id=:tid AND fe_id=:id", tid, feId);
        exec("DELETE FROM team_members WHERE tenant_id=:tid AND fe_id=:id", tid, feId);

        // Remove FE role binding (keep user)
        em.createNativeQuery("""
            DELETE FROM user_roles
             WHERE tenant_id=:tid AND role_code='FE'
               AND user_id IN (SELECT user_id FROM field_engineers WHERE tenant_id=:tid AND id=:id)
        """).setParameter("tid", tid).setParameter("id", feId).executeUpdate();

        // Capture user id before deleting FE (for optional orphan cleanup)
        Object uidObj = em.createNativeQuery("""
            SELECT user_id FROM field_engineers WHERE tenant_id=:tid AND id=:id
        """).setParameter("tid", tid).setParameter("id", feId).getSingleResult();
        Long userId = (uidObj == null) ? null : ((Number) uidObj).longValue();

        // Delete FE
        exec("DELETE FROM field_engineers WHERE tenant_id=:tid AND id=:id", tid, feId);

        // Optional orphan user prune
        if (deleteUserIfOrphan && userId != null) {
            int roles = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM user_roles WHERE user_id=:u")
                .setParameter("u", userId).getSingleResult()).intValue();
            int fe = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM field_engineers WHERE user_id=:u")
                .setParameter("u", userId).getSingleResult()).intValue();
            int cust = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM customers WHERE user_id=:u")
                .setParameter("u", userId).getSingleResult()).intValue();
            if (roles == 0 && fe == 0 && cust == 0) {
                em.createNativeQuery("DELETE FROM password_reset_tokens WHERE user_id=:u")
                  .setParameter("u", userId).executeUpdate();
                em.createNativeQuery("DELETE FROM users WHERE id=:u")
                  .setParameter("u", userId).executeUpdate();
            }
        }
    }
}
