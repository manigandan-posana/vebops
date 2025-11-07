package com.vebops.context;

public class TenantContext {
    private static final ThreadLocal<Long> TENANT = new ThreadLocal<>();
    private static final ThreadLocal<Long> USER = new ThreadLocal<>();
    private static final ThreadLocal<String> ROLE = new ThreadLocal<>();

    public static void setTenantId(Long id) { TENANT.set(id); }
    public static Long getTenantId() { return TENANT.get(); }
    public static void clear() { TENANT.remove(); USER.remove(); ROLE.remove(); }

    public static void setUserId(Long id) { USER.set(id); }
    public static Long getUserId() { return USER.get(); }

    public static void setRole(String r) { ROLE.set(r); }
    public static String getRole() { return ROLE.get(); }
}
