package com.vebops.dto;

import jakarta.validation.constraints.*;

public class AssignFERequest {
    @NotNull public Long feId;
    public String note;
}
