package com.vebops.service;

import com.vebops.domain.enums.ServiceTypeCode;

public interface IntakeService {
  Long createFromCall(Long tenantId, String name, String email, String mobile, String address, ServiceTypeCode serviceType, String hint);
  Long createFromEmail(Long tenantId, String rawEmail); // parser may infer serviceType from text
}
