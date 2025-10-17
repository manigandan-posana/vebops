package com.vebops.dto;

import jakarta.validation.constraints.*;

public class CreateBackOfficeUserRequest {
    @NotBlank public String code;
    @NotBlank public String name;
    @NotBlank public String displayName;
    @Email @NotBlank public String email;
    @Size(min=6) public String password;
}
