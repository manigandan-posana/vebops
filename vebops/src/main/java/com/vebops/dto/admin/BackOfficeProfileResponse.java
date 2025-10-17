package com.vebops.dto.admin;

public class BackOfficeProfileResponse {
    public Long userId;
    public Long tenantId;
    public String tenantCode;
    public String tenantName;
    public String displayName;
    public String email;

    public BackOfficeProfileResponse(Long userId, Long tenantId, String tenantCode, String tenantName,
                                     String displayName, String email) {
        this.userId = userId;
        this.tenantId = tenantId;
        this.tenantCode = tenantCode;
        this.tenantName = tenantName;
        this.displayName = displayName;
        this.email = email;
    }
}
