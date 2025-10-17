package com.vebops.dto;

import com.vebops.domain.enums.DocumentKind;
import jakarta.validation.constraints.*;

public class UploadDocumentRequest {
    @NotNull public DocumentKind kind;   // PDF / PHOTO / NOTE
    @NotBlank public String url;         // storage link
    @NotBlank public String filename;    // display name
}
