package com.vebops.dto;

/**
 * Optional/partial update for a Customer from Back Office.
 * Any non-null field will be applied.
 */
public class UpdateCustomerRequest {
    public String name;
    public String email;
    public String mobile;
    public String address;
    public Boolean updatePortalEmail = false;
    public Boolean enablePortal = null;
}
