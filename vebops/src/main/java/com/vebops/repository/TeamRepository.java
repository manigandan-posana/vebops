package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.Team;

@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {
    List<Team> findByTenantId(Long tenantId);
        Optional<Team> findByTenantIdAndName(Long tenantId, String name);
}
