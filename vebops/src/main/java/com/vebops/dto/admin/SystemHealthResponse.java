package com.vebops.dto.admin;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

public class SystemHealthResponse {
    public String status;          // "UP" | "DEGRADED" | "DOWN"
    public String database;        // "UP" | "DOWN"
    public String version;         // app version if available
    public Instant serverTime = Instant.now();
    public Map<String, Object> details = new LinkedHashMap<>();
}
