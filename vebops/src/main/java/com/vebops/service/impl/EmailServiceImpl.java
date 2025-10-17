package com.vebops.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.SimpleMailMessage;

import com.vebops.service.EmailService;
import com.vebops.repository.EmailTemplateRepository;
import com.vebops.repository.EmailLogRepository;
import com.vebops.domain.EmailTemplate;
import com.vebops.domain.EmailLog;
import com.vebops.domain.enums.EmailEntityType;
import com.vebops.util.TemplateRenderer;
import com.vebops.util.AiWriter;

import java.util.HashMap;
import java.util.Map;

@Service
public class EmailServiceImpl implements EmailService {

    private final EmailTemplateRepository tplRepo;
    private final EmailLogRepository logRepo;
    /**
     * JavaMailSender is used to send real emails. It is optional and can be
     * configured via Spring Boot properties. When present the service will
     * attempt to deliver outgoing mail to the specified SMTP server. If
     * JavaMailSender is not configured the send() method will still persist
     * the EmailLog but skip the SMTP send.
     */
    private final JavaMailSender mailSender;

    public EmailServiceImpl(EmailTemplateRepository t, EmailLogRepository l, JavaMailSender mailSender) {
        this.tplRepo = t;
        this.logRepo = l;
        this.mailSender = mailSender;
    }

    @Override
    public String renderTemplate(Long tenantId, String templateCode, Map<String, Object> vars, boolean viaAi) {
        EmailTemplate tpl = tplRepo.findByTenantId(tenantId).stream()
            .filter(t -> t.getCode().equals(templateCode))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Template not found: " + templateCode));
        String body = TemplateRenderer.render(tpl.getBodyWithVars(), vars);
        return viaAi ? AiWriter.expand(body, vars) : body;
    }

    @Override
    @Transactional(noRollbackFor = Exception.class)
    public void send(Long tenantId, String toEmail, String subject, String body,
                    EmailEntityType entityType, Long entityId, boolean viaAi) {

        EmailLog log = new EmailLog();
        log.setTenantId(tenantId);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setToEmail(toEmail);
        log.setSubject(subject);
        log.setBody(body);
        log.setViaAi(viaAi);
        logRepo.save(log);

        if (this.mailSender != null && toEmail != null && !toEmail.isBlank()) {
            try {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setTo(toEmail);
                msg.setSubject(subject);
                msg.setText(body);
                this.mailSender.send(msg);
            } catch (Exception ex) {
                // swallow SMTP errors — log already persisted
            }
        }
    }

    @Override
    @Transactional(noRollbackFor = Exception.class)
    public void send(Long tenantId, String toEmail, String subject, String body,
                    String entityType, Long entityId, boolean viaAi) {
        EmailEntityType type;
        try {
            type = EmailEntityType.valueOf(entityType);
        } catch (Exception e) {
            // Fallback so callers don’t crash if they pass an unknown string
            type = EmailEntityType.USER;
        }
        send(tenantId, toEmail, subject, body, type, entityId, viaAi);
    }

    @Override
    public void sendUserCredentials(Long tenantId, Long userId, String toEmail,
                                    String displayName, String roleLabel,
                                    String loginEmail, String tempPassword) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("name", displayName == null ? "" : displayName);
        vars.put("role", roleLabel == null ? "User" : roleLabel);
        vars.put("email", loginEmail == null ? "" : loginEmail);
        vars.put("password", tempPassword == null ? "" : tempPassword);

        String subject = "Welcome to Vebops — your " + vars.get("role") + " access";
        String body;
        try {
            // If you have a tenant-custom template named USER_CREDENTIALS, use it
            body = renderTemplate(tenantId, "USER_CREDENTIALS", vars, /*viaAi*/ false);
        } catch (Exception ignore) {
            // Friendly fallback
            body =
                "Hi " + vars.get("name") + ",\n\n" +
                "Your " + vars.get("role") + " account has been created on Vebops.\n\n" +
                "Login email: " + vars.get("email") + "\n" +
                "Temporary password: " + vars.get("password") + "\n\n" +
                "For security, please sign in and change your password right away.\n" +
                "If you didn’t expect this email, please contact your administrator.\n\n" +
                "— Vebops Team";
        }
        // entityType USER is fine; pass userId for traceability
        send(tenantId, toEmail, subject, body, "USER", userId, false);
    }

}
