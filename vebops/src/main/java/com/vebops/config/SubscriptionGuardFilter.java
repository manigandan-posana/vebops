package com.vebops.config;

import com.vebops.context.TenantContext;
import com.vebops.exception.SubscriptionLockedException;
import com.vebops.service.TenantGuard;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SubscriptionGuardFilter extends OncePerRequestFilter {

    private final TenantGuard tenantGuard;

    public SubscriptionGuardFilter(TenantGuard tenantGuard) {
        this.tenantGuard = tenantGuard;
    }

    /** Skip the guard for admin, public endpoints, and admin routes. */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        final String uri = request.getRequestURI();
        final String method = request.getMethod();

        // CORS preflight or public docs/assets
        if ("OPTIONS".equalsIgnoreCase(method)) return true;
        if (uri.startsWith("/auth/") || uri.startsWith("/actuator/") || uri.startsWith("/docs/")
                || uri.startsWith("/swagger") || uri.startsWith("/v3/api-docs")
                || uri.startsWith("/assets/") || uri.startsWith("/static/") || uri.equals("/")) {
            return true;
        }

        // Full bypass for admin area
        if (uri.startsWith("/admin/")) return true;

        // Bypass for authenticated ADMIN users regardless of path
        final Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            for (GrantedAuthority ga : auth.getAuthorities()) {
                final String a = ga.getAuthority();
                if ("ADMIN".equals(a) || "ROLE_ADMIN".equals(a)) {
                    return true;
                }
            }
        }
        return false;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        // If shouldNotFilter() returned true, Spring won't call this method.
        // Otherwise, enforce active subscription for the resolved tenant.
        final Long tenantId = TenantContext.getTenantId(); // set earlier by JwtAuthFilter
        if (tenantId != null) {
            try {
                tenantGuard.assertActive(tenantId);
            } catch (SubscriptionLockedException ex) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write("{\"message\":\"Subscription inactive\"}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
