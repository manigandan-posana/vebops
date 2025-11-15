package com.vebops.repository;

import com.vebops.domain.DocumentSequence;
import com.vebops.domain.DocumentSequence.Scope;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface DocumentSequenceRepository extends JpaRepository<DocumentSequence, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<DocumentSequence> findByTenantIdAndScopeAndFiscalYear(Long tenantId, Scope scope, String fiscalYear);
}
