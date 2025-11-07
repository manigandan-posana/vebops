package com.vebops.dto;

import com.vebops.domain.FieldEngineer;
import com.vebops.domain.User;
import com.vebops.domain.enums.FEStatus;

public record FieldEngineerDto(
        Long id,
        FEStatus status,
        Long userId,
        String userName,
        String userEmail
) {
    public static FieldEngineerDto from(FieldEngineer fe) {
        User u = fe.getUser(); // loaded via @EntityGraph in repo
        return new FieldEngineerDto(
                fe.getId(),
                fe.getStatus(),
                (u != null ? u.getId() : null),
                (u != null ? u.getDisplayName() : null),
                (u != null ? u.getEmail() : null)
        );
    }
}
