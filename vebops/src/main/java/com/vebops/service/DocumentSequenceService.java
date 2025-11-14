package com.vebops.service;

import com.vebops.domain.DocumentSequence;
import com.vebops.domain.DocumentSequence.Scope;
import com.vebops.repository.DocumentSequenceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class DocumentSequenceService {

    private final DocumentSequenceRepository repository;

    public DocumentSequenceService(DocumentSequenceRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public String nextNumber(Long tenantId, Scope scope, LocalDate referenceDate, String prefix, int minDigits) {
        if (tenantId == null) {
            throw new IllegalArgumentException("Tenant is required to generate document numbers");
        }
        if (scope == null) {
            throw new IllegalArgumentException("Scope is required to generate document numbers");
        }
        LocalDate date = referenceDate != null ? referenceDate : LocalDate.now();
        String fiscalYear = toFiscalYear(date);

        DocumentSequence sequence = repository
            .findByTenantIdAndScopeAndFiscalYear(tenantId, scope, fiscalYear)
            .orElseGet(() -> {
                DocumentSequence fresh = new DocumentSequence();
                fresh.setTenantId(tenantId);
                fresh.setScope(scope);
                fresh.setFiscalYear(fiscalYear);
                fresh.setLastNumber(0L);
                return fresh;
            });

        long current = sequence.getLastNumber() != null ? sequence.getLastNumber() : 0L;
        long next = current + 1L;
        sequence.setLastNumber(next);
        repository.saveAndFlush(sequence);

        String formatted = format(prefix, next, minDigits);
        return formatted + "/" + fiscalYear;
    }

    public String toFiscalYear(LocalDate date) {
        LocalDate effective = date != null ? date : LocalDate.now();
        int year = effective.getYear();
        int startYear = effective.getMonthValue() >= 4 ? year : year - 1;
        int endYear = startYear + 1;
        return String.format("%02d-%02d", startYear % 100, endYear % 100);
    }

    private String format(String prefix, long value, int minDigits) {
        String safePrefix = prefix == null ? "" : prefix.trim();
        int width = Math.max(minDigits, String.valueOf(value).length());
        return safePrefix + String.format("%0" + width + "d", value);
    }
}
