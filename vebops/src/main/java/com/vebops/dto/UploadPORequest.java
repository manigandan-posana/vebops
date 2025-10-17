package com.vebops.dto;

import jakarta.validation.constraints.*;

public class UploadPORequest {
    @NotBlank public String poNumber;
    @NotBlank public String fileUrl;
}
