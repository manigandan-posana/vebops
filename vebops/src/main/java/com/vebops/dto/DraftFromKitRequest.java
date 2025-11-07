package com.vebops.dto;

import jakarta.validation.constraints.*;
import com.vebops.domain.enums.ServiceTypeCode;

public class DraftFromKitRequest {
    /**
     * Optional ID of an existing customer.  If absent a new customer will be
     * created using the supplied contact details.
     */
    public Long customerId;
    @NotNull public ServiceTypeCode serviceType;
    @NotNull public Long kitId;
    public String terms;

    // Optional details to create a new customer on the fly if customerId is not provided.
    /**
     * Name of the customer.  If {@link #customerId} is null this field
     * must be provided to create a new {@link com.vebops.domain.Customer}.
     */
    public String customerName;

    /**
     * Optional email for the new customer.  Must be a valid email format when
     * supplied.
     */
    @Email
    public String email;

    /**
     * Optional mobile number for the new customer.
     */
    public String mobile;

    /**
     * Optional address for the new customer.
     */
    public String address;
}
