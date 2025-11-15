package com.vebops.dto;

import java.time.Instant;

/**
 * Aggregated workload metrics for a field engineer. Surfaced on the back-office
 * dashboard to help dispatchers balance assignments.
 */
public record FieldEngineerPerformanceDto(
        Long fieldEngineerId,
        String name,
        String email,
        String status,
        long activeWorkOrders,
        long overdueWorkOrders,
        long completedLast30Days,
        Double averageCompletionDays,
        Instant lastProgressAt
) {}
