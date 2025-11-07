package com.vebops.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.vebops.domain.Customer;
import com.vebops.domain.User;
import com.vebops.domain.UserRole;
import com.vebops.domain.enums.RoleCode;
import com.vebops.repository.CustomerRepository;
import com.vebops.repository.UserRepository;
import com.vebops.repository.UserRoleRepository;

@Component
public class PortalAccountManager {

    private final UserRepository users;
    private final UserRoleRepository roles;
    private final CustomerRepository customers;
    private final PasswordEncoder encoder;
    private final EmailService emailService;

    public PortalAccountManager(
            UserRepository users,
            UserRoleRepository roles,
            CustomerRepository customers,
            PasswordEncoder encoder,
            EmailService emailService) {
        this.users = users;
        this.roles = roles;
        this.customers = customers;
        this.encoder = encoder;
        this.emailService = emailService;
    }

    public static record Result(Long userId, boolean createdNewUser, boolean addedRole) {}

    /**
     * Ensure the given customer has a linked portal user with CUSTOMER role for the tenant.
     * - If no email on the customer, this is a no-op.
     * - If a user with that email exists, link it (if not linked) and ensure the role.
     * - If no user exists, create one, assign role, link, and optionally email creds.
     * Idempotent by design.
     */
    @Transactional
    public Result ensureForCustomer(Long tenantId, Customer c, boolean sendCredentials) {
        if (c == null) return new Result(null, false, false);
        String email = c.getEmail();
        if (email == null || email.isBlank()) return new Result(null, false, false);

        // 1) Find or create the User
        boolean createdUser = false;
        User u = users.findByEmail(email).orElse(null);

        if (u == null) {
            String rawPwd = com.vebops.util.Passwords.generate(12);
            u = new User();
            u.setDisplayName((c.getName() != null && !c.getName().isBlank()) ? c.getName() : email);
            u.setEmail(email);
            u.setPasswordHash(encoder.encode(rawPwd));
            u.setActive(true);
            u = users.save(u);
            createdUser = true;

            if (sendCredentials) {
                emailService.sendUserCredentials(
                    tenantId, u.getId(), email,
                    u.getDisplayName(), "Customer Portal",
                    email, rawPwd
                );
            }
        }

        // 2) Ensure CUSTOMER role for this tenant
        boolean addedRole = false;
        boolean hasRole = roles.existsByUser_IdAndTenantIdAndRoleCode(u.getId(), tenantId, RoleCode.CUSTOMER);
        if (!hasRole) {
            UserRole ur = new UserRole();
            ur.setUser(u);
            ur.setTenantId(tenantId);
            ur.setRoleCode(RoleCode.CUSTOMER);
            ur.setPrimaryRole(false);
            roles.save(ur);
            addedRole = true;
        }

        // 3) Link to Customer if not already
        if (c.getPortalUser() == null || !u.getId().equals(c.getPortalUser().getId())) {
            c.setPortalUser(u);
            customers.save(c);
        }

        return new Result(u.getId(), createdUser, addedRole);
    }
}
