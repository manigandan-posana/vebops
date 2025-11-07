package com.vebops.dto.admin;

import java.time.LocalDate;

public class TenantListItem {
  public Long id;
  public String code;
  public String name;
  public boolean active;

  // latest subscription summary (nullable)
  public String latestStatus;      // ACTIVE / INACTIVE / null
  public LocalDate latestStartsAt; // nullable
  public LocalDate latestEndsAt;   // nullable
  public String email;
  public Long backOfficeUserId;
  public String backOfficeEmail;
  public String backOfficeDisplayName;
}
