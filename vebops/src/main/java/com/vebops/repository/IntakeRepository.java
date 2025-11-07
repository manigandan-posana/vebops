package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.Intake;

@Repository
public interface IntakeRepository extends JpaRepository<Intake, Long> {
    List<Intake> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
}
