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

    /**
     * Persist a generated service invoice PDF to the local filesystem.  Invoices
     * are organised under the storage root by tenant and service identifiers
     * using the following path pattern:
     * <pre>
     *   root/t=&lt;tenantId&gt;/service=&lt;serviceId&gt;/doc=&lt;docId&gt;/&lt;filename&gt;
     * </pre>
     *
     * The provided filename will be sanitised to remove any characters which
     * could lead to directory traversal or other unsafe behaviour.  The
     * directory hierarchy will be created on demand.
     *
     * @param tenantId  the tenant ID associated with the invoice
     * @param serviceId the service ID associated with the invoice
     * @param docId     the persisted Document ID; used to isolate multiple docs
     * @param filename  the desired filename (with .pdf extension)
     * @param content   the PDF data to store
     * @return the sanitised filename used on disk
     * @throws IOException if the file cannot be written
     */
    public String saveServiceInvoiceDoc(Long tenantId,
                                        Long serviceId,
                                        Long docId,
                                        String filename,
                                        byte[] content) throws IOException {
        String safeName = sanitizeFilename(filename);
        Path dir = root.resolve("t=" + tenantId)
                        .resolve("service=" + serviceId)
                        .resolve("doc=" + docId);
        Files.createDirectories(dir);
        Path dest = dir.resolve(safeName);
        Files.write(dest, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        return safeName;
    }

    /**
     * Load a previously stored service invoice PDF from the local filesystem.
     * This helper reconstructs the storage path using the tenant, service and
     * document identifiers and returns the corresponding File handle.  No
     * sanitisation is performed on the filename parameter – callers must
     * ensure it contains only a filename (no path separators) and matches
     * the value returned from {@link #saveServiceInvoiceDoc(Long, Long, Long, String, byte[])}.
     *
     * @param tenantId  the tenant ID associated with the invoice
     * @param serviceId the service ID associated with the invoice
     * @param docId     the Document ID associated with the invoice
     * @param filename  the stored filename
     * @return a File pointing to the stored PDF
     */
    public File loadServiceInvoiceDoc(Long tenantId,
                                      Long serviceId,
                                      Long docId,
                                      String filename) {
        Path p = root.resolve("t=" + tenantId)
                     .resolve("service=" + serviceId)
                     .resolve("doc=" + docId)
                     .resolve(filename);
        return p.toFile();
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

    // add into FileStorageService
public String saveProposalDoc(Long tenantId, Long proposalId, Long docId, String originalFilename, byte[] content) throws IOException {
    String safeName = safe(originalFilename);
    Path dir = root.resolve("t=" + tenantId)
                   .resolve("proposal=" + proposalId)
                   .resolve("doc=" + docId);
    Files.createDirectories(dir);
    Path out = dir.resolve(safeName);
    Files.write(out, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    return safeName;
}

// helper: use your existing safe filename method if present, else:
private String safe(String name){
    if (name == null) name = "document.pdf";
    name = org.springframework.util.StringUtils.getFilename(name);
    if (name == null || name.isBlank()) name = "document.pdf";
    return name.replaceAll("[^A-Za-z0-9._-]", "_");
}

// Load previously-saved proposal document as a File
public java.io.File loadProposalDocs(Long tenantId, Long proposalId, Long docId, String filename) {
    java.nio.file.Path p = root
        .resolve("t=" + tenantId)
        .resolve("proposal=" + proposalId)
        .resolve("doc=" + docId)
        .resolve(filename);
    return p.toFile();
}

// Store a PO file uploaded by customer
public String saveProposalPo(Long tenantId, Long proposalId, String originalFilename, byte[] content)
        throws java.io.IOException {
    String safe = safe(originalFilename);
    java.nio.file.Path dir = root.resolve("t=" + tenantId)
        .resolve("proposal=" + proposalId)
        .resolve("po");
    java.nio.file.Files.createDirectories(dir);
    java.nio.file.Path out = dir.resolve(safe);
    java.nio.file.Files.write(out, content,
      java.nio.file.StandardOpenOption.CREATE,
      java.nio.file.StandardOpenOption.TRUNCATE_EXISTING);
    return safe;
}




}

