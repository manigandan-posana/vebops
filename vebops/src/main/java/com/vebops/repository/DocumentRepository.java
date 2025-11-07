package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.Document;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    List<Document> findByEntityTypeAndEntityIdAndTenantId(
        DocumentEntityType entityType,
        Long entityId,
        Long tenantId
    );
    // Convenience overloads
    List<Document> findByTenantIdAndEntityId(Long tenantId, Long entityId);
}
