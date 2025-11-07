package com.vebops.dto;

import com.vebops.domain.Customer;
import com.vebops.domain.User;

public record CustomerDto(
        Long id,
        String name,
        String email,
        String mobile,
        String address,
        Long portalUserId,
        String portalUserEmail,
        String portalUserDisplayName
) {
    public static CustomerDto from(Customer c) {
        User u = c.getPortalUser();
        return new CustomerDto(
                c.getId(),
                c.getName(),
                c.getEmail(),
                c.getMobile(),
                c.getAddress(),
                u != null ? u.getId() : null,
                u != null ? u.getEmail() : null,
                u != null ? u.getDisplayName() : null
        );
    }
}
