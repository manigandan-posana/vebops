package com.vebops.service.impl;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.vebops.service.TenantGuard;
import com.vebops.repository.SubscriptionRepository;
import com.vebops.domain.Subscription;
import com.vebops.domain.enums.SubscriptionStatus;
import com.vebops.exception.SubscriptionLockedException;
import java.time.LocalDate;
import java.util.Optional;

@Service
@Transactional(readOnly = true, noRollbackFor = SubscriptionLockedException.class)
public class TenantGuardImpl implements TenantGuard {

    private final SubscriptionRepository subRepo;

    public TenantGuardImpl(SubscriptionRepository subRepo) { this.subRepo = subRepo; }

    @Override
    public void assertActive(Long tenantId) {
        if (currentUserHasAnyRole("SUPER_ADMIN", "ADMIN")) return;
        Optional<Subscription> sub = subRepo.findTopByTenant_IdOrderByEndsAtDesc(tenantId);
        if (sub.isEmpty()) throw new SubscriptionLockedException("No subscription for tenant " + tenantId);
        Subscription s = sub.get();
        LocalDate now = LocalDate.now();
        if (s.getStatus() != SubscriptionStatus.ACTIVE || now.isBefore(s.getStartsAt()) || now.isAfter(s.getEndsAt())) {
            throw new SubscriptionLockedException("Subscription not active for tenant " + tenantId);
        }
    }
    private boolean currentUserHasAnyRole(String... roles) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        var have = auth.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(java.util.stream.Collectors.toSet());
        for (var r : roles) {
            if (have.contains("ROLE_" + r) || have.contains(r)) return true;
        }
        return false;
    }
}
