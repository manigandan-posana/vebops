package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.EmailLog;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    List<EmailLog> findByTenantIdAndEntityTypeAndEntityIdOrderBySentAtDesc(Long tenantId, EmailEntityType entityType, Long entityId);
}
