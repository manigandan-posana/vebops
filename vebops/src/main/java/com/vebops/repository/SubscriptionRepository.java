package com.vebops.repository;

import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;
import java.util.*;
import com.vebops.domain.enums.*;
import com.vebops.domain.Subscription;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findTopByTenant_IdOrderByEndsAtDesc(Long tenantId);
    List<Subscription> findByTenant_IdAndStatus(Long tenantId, SubscriptionStatus status);
}
