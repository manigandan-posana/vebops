package com.vebops.dto;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Lightweight projection surfaced on the back-office dispatch board. Each row
 * summarises a work order that is currently active along with the assigned
 * field engineer, due date and the latest activity timestamp.
 */
public record DispatchBoardRow(
        Long workOrderId,
        String wan,
        String status,
        LocalDate dueDate,
        Long daysUntilDue,
        boolean overdue,
        String customerName,
        String serviceType,
        String siteAddress,
        String fieldEngineerName,
        String fieldEngineerEmail,
        Instant lastProgressAt,
        Instant lastUpdatedAt
) {}
