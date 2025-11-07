package com.vebops.dto.admin;

import java.time.Instant;
import java.time.LocalDate;

public class TenantProfileResponse {
  public Long id;
  public String code;
  public String name;
  public boolean active;
  public Instant createdAt;

  public static class LatestSubscription {
    public Long id;
    public String status; // ACTIVE / INACTIVE
    public LocalDate startsAt;
    public LocalDate endsAt;
  }
  public LatestSubscription latestSubscription;
}
