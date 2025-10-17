package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.TeamMember;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    List<TeamMember> findByTenantIdAndTeam_Id(Long tenantId, Long teamId);
        boolean existsByTenantIdAndTeam_IdAndFieldEngineer_Id(Long tenantId, Long teamId, Long feId);
}
