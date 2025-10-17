package com.vebops.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.*;

// imports unchanged

@Service
public class FileStorageService {
    private final Path root;

    public FileStorageService(
        @Value("${vebops.storage.root:./data/uploads}") String rootDir
    ) {
        this.root = Paths.get(rootDir).toAbsolutePath().normalize();
    }

    public static String sanitizeFilename(String original) {
        String base = (original != null && !original.isBlank()) ? original : "document.pdf";
        // remove CR/LF and replace path separators
        String safe = base.replaceAll("[\\r\\n]", "_").replaceAll("[/\\\\]+", "_").trim();
        if (!safe.toLowerCase().endsWith(".pdf")) {
            safe = safe + ".pdf";
        }
        return safe;
    }

   public String saveProposalDoc(Long tenantId, Long proposalId, Long docId, MultipartFile file) throws IOException {
        String safeName = sanitizeFilename(StringUtils.getFilename(file.getOriginalFilename()));
        Path dir = root.resolve("t=" + tenantId)
                        .resolve("proposal=" + proposalId)
                        .resolve("doc=" + docId);
        Files.createDirectories(dir);

        Path dest = dir.resolve(safeName);
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
    }
        return safeName;
        }

    public File loadProposalDoc(Long tenantId, Long proposalId, Long docId, String filename) {
        return root.resolve("t=" + tenantId)
                    .resolve("proposal=" + proposalId)
                    .resolve("doc=" + docId)
                    .resolve(filename)
                    .toFile();
    }


}

