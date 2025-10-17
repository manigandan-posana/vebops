package com.vebops.dto;
public class LoginResponse {
    public Long userId;
    public Long tenantId;
    public String role; // ADMIN|BACK_OFFICE|FE|CUSTOMER|SUPER_ADMIN
    public String redirectPath; // /admin/dashboard etc.
    public String jwt;

    /**
     * Indicates whether the tenant associated with this user currently has
     * an active subscription. Clients can inspect this flag to show or
     * hide application content accordingly. If {@code false}, the UI
     * should typically display a subscription lock message and prevent
     * navigation beyond the login screen. Backends that rely on the
     * {@link com.vebops.config.SubscriptionGuardFilter} will also enforce
     * subscription status on every request.
     */
    public Boolean subscriptionActive;

    /**
     * Container for additional user-level fields that may be returned at
     * login time. In order to align with the expectations of the
     * frontend Redux auth slice, any values placed into this map will
     * be available under {@code auth.user} after login. At present the
     * only field populated is {@code subscriptionActive}. If you add
     * further fields here be sure to update the frontend accordingly.
     */
    public java.util.Map<String, Object> user;
}
