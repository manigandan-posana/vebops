package com.vebops.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateCustomerRequest {
    @NotBlank public String name;
    @Email @NotBlank public String email;
    @Pattern(regexp = "^[0-9+\\- ]{7,}$", message="Invalid mobile") public String mobile;
    @NotBlank public String address;
    public Boolean createPortal = false;
}