package com.vebops.service.impl;

import com.vebops.domain.User;
import com.vebops.domain.UserRole;
import com.vebops.domain.enums.RoleCode;
import com.vebops.dto.LoginRequest;
import com.vebops.dto.LoginResponse;
import com.vebops.exception.BusinessException;
import com.vebops.repository.UserRepository;
import com.vebops.repository.UserRoleRepository;
import com.vebops.service.AuthService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vebops.repository.CustomerRepository;
import com.vebops.repository.FieldEngineerRepository;

import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class AuthServiceImpl implements AuthService {

    private final UserRepository users;
    private final UserRoleRepository userRoles;
    private final PasswordEncoder encoder;
    private final CustomerRepository customers;
    private final FieldEngineerRepository feRepo;
    /**
     * Guard to verify tenant subscription status. Rather than leaking
     * exceptions to the caller, this service will check subscription
     * status on login and expose a boolean flag in the response. The
     * underlying guard throws a {@link com.vebops.exception.SubscriptionLockedException}
     * if the tenant is inactive; callers should therefore catch and
     * handle that exception appropriately when using this service outside
     * of the login flow.
     */
    private final com.vebops.service.TenantGuard tenantGuard;

    public AuthServiceImpl(UserRepository users,
                           UserRoleRepository userRoles,
                           PasswordEncoder encoder,
                           com.vebops.service.TenantGuard tenantGuard, CustomerRepository customers, FieldEngineerRepository feRepo) {
        this.users = users;
        this.userRoles = userRoles;
        this.encoder = encoder;
        this.tenantGuard = tenantGuard;
        this.customers = customers;
        this.feRepo = feRepo;
    }

    @Override
    public LoginResponse login(LoginRequest req) {
        User user = users.findByEmail(req.email)
                .orElseThrow(() -> new BusinessException("Invalid credentials"));

        if (!user.isActive() || !encoder.matches(req.password, user.getPasswordHash())) {
            throw new BusinessException("Invalid credentials");
        }

        // Fetch all roles for this user across tenants. Use the repository
        // method directly rather than reflection for type safety and
        // maintainability.
        List<UserRole> roles = userRoles.findByUser_Id(user.getId());
        if (roles.isEmpty()) {
            throw new BusinessException("No tenant access configured for this user");
        }

        // Prefer primary role if set; otherwise first
        UserRole ur = roles.stream()
                .sorted(Comparator.comparing(UserRole::isPrimaryRole).reversed())
                .findFirst()
                .get();

        String redirect = switch (ur.getRoleCode()) {
            case ADMIN -> "/admin/dashboard";
            case BACK_OFFICE -> "/office/requests";
            case FE -> "/fe/assigned";
            case CUSTOMER -> "/customer/proposals";
            default -> "/";
        };

        LoginResponse res = new LoginResponse();
        res.userId = user.getId();
        res.tenantId = ur.getTenantId();
        res.role = ur.getRoleCode().name();
        res.redirectPath = redirect;
        //compose jwt
        // After setting role / redirectPath
        if (ur.getRoleCode() == RoleCode.FE) {
            feRepo.findFirstByTenantIdAndUser_Id(ur.getTenantId(), user.getId()).ifPresent(fe -> {
                if (res.user == null) res.user = new java.util.HashMap<>();
                res.user.put("feId", fe.getId());                       // ✅ FE primary key for frontend
                if (fe.getHomeStore() != null) {
                    res.user.put("homeStoreId", fe.getHomeStore().getId());
                }
                res.user.put("feStatus", fe.getStatus().name());
            });
        }

        if (ur.getRoleCode() == com.vebops.domain.enums.RoleCode.CUSTOMER) {
            var maybeCustomer = customers.findByTenantIdAndPortalUser_Id(ur.getTenantId(), user.getId());
            if (maybeCustomer.isPresent()) {
                if (res.user == null) res.user = new java.util.HashMap<>();
                res.user.put("customerId", maybeCustomer.get().getId());
                res.user.put("customerName", maybeCustomer.get().getName());
            }
        }
        //end compose jwt
        // Determine subscription status for this tenant. Use the TenantGuard
        // to perform a soft check: if the subscription is inactive the
        // guard will throw an exception which we convert into a boolean flag.
        boolean active;
        try {
            tenantGuard.assertActive(ur.getTenantId());
            active = true;
        } catch (com.vebops.exception.SubscriptionLockedException ex) {
            active = false;
        }
        res.subscriptionActive = active;
        // Populate the nested user map. The frontend expects a "user"
        // property on the response that contains at minimum the
        // subscriptionActive flag. Additional fields may be added here in
        // future to avoid breaking consumers that rely on this shape.
        java.util.Map<String, Object> userMap = (res.user != null)
            ? new java.util.HashMap<>(res.user)
            : new java.util.HashMap<>();
        userMap.put("subscriptionActive", active);
        res.user = userMap;
        return res;
    }

    /**
     * Legacy reflection-based role lookup has been removed in favour of
     * directly invoking {@link UserRoleRepository#findByUser_Id(Long)}. This
     * method is no longer used but remains for binary compatibility with
     * older callers. It simply delegates to the repository and always
     * returns a non-null list.
     *
     * @deprecated use {@link UserRoleRepository#findByUser_Id(Long)} instead
     */
    @Deprecated
    private List<UserRole> findRolesForUser(Long userId) {
        return userRoles.findByUser_Id(userId);
    }
}
