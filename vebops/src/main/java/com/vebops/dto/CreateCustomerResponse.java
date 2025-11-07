package com.vebops.dto;

public class CreateCustomerResponse {
    public Long customerId;
    public Long portalUserId;  // null if no email was provided
    public boolean invited;    // true if reset email sent

    public CreateCustomerResponse(Long cId, Long uId, boolean invited) {
        this.customerId = cId;
        this.portalUserId = uId;
        this.invited = invited;
    }
}