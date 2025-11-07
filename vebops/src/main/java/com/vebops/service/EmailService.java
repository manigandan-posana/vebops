package com.vebops.service;

import java.util.Map;

import com.vebops.domain.enums.EmailEntityType;

public interface EmailService {
    void send(Long tenantId, String toEmail, String subject, String body, String entityType, Long entityId, boolean viaAi);
    String renderTemplate(Long tenantId, String templateCode, Map<String, Object> vars, boolean viaAi);
    void sendUserCredentials(Long tenantId, Long userId, String toEmail,
                             String displayName, String roleLabel,
                             String loginEmail, String tempPassword);
    void send(Long tenantId, String toEmail, String subject, String body,
              EmailEntityType entityType, Long entityId, boolean viaAi);
    String renderProposalTemplate(Long tenantId, String templateCode, Map<String, Object> vars, boolean viaAi);
    void sendWithAttachment(Long tenantId, String toEmail, String subject, String body, String filename, byte[] content, String contentType, EmailEntityType entityType, Long entityId);
}
