package com.vebops.dto;

import java.time.Instant;

/**
 * Snapshot of the workload for the currently authenticated field engineer.
 */
public record FeDashboardSummary(
        long totalAssignments,
        long inProgress,
        long dueToday,
        long overdue,
        long awaitingMaterials,
        Instant lastProgressAt
) {}
