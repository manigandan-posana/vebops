package com.vebops.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.core.env.Environment;

import com.vebops.service.IntakeService;

/**
 * A scheduled component that polls an inbound email mailbox and forwards raw
 * email messages into the intake parser. This is a best-effort integration
 * point for providers that cannot directly call the REST endpoint. The poller
 * is disabled until the required configuration properties (mail.intake.host,
 * mail.intake.username, mail.intake.password and mail.intake.tenantId) are
 * provided. To implement a real IMAP integration this class should use
 * JavaMail's IMAP API to connect to the mailbox, fetch unread messages and
 * call {@link IntakeService#createFromEmail(Long, String)} for each one.
 */
@Component
public class EmailIntakePoller {

    private static final Logger log = LoggerFactory.getLogger(EmailIntakePoller.class);

    private final Environment env;
    private final IntakeService intake;

    public EmailIntakePoller(Environment env, IntakeService intake) {
        this.env = env;
        this.intake = intake;
    }

    /**
     * Poll the configured mailbox every 5 minutes. This method is a stub and
     * does not perform any real IMAP operations unless all required
     * properties are provided. To enable polling set the following
     * properties in application.properties or environment variables:
     *
     * mail.intake.host     = IMAP server hostname
     * mail.intake.port     = IMAP server port (optional, default 993)
     * mail.intake.username = mailbox username
     * mail.intake.password = mailbox password
     * mail.intake.tenantId = tenant ID to assign new intakes to
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000L)
    public void pollMailbox() {
        String host = env.getProperty("mail.intake.host");
        String username = env.getProperty("mail.intake.username");
        String password = env.getProperty("mail.intake.password");
        String tenantIdStr = env.getProperty("mail.intake.tenantId");
        if (host == null || username == null || password == null || tenantIdStr == null) {
            // Poller is disabled until all properties are set
            return;
        }
        Long tenantId;
        try {
            tenantId = Long.parseLong(tenantIdStr);
        } catch (NumberFormatException ex) {
            log.warn("Invalid mail.intake.tenantId '{}': {}", tenantIdStr, ex.getMessage());
            return;
        }
        // Real IMAP integration would go here. For now we log that polling would occur.
        log.debug("Polling email inbox for intake messages on host {} as user {}", host, username);
        // TODO: Connect to IMAP, fetch unseen messages, parse raw text and call intake.createFromEmail()
        // Example:
        // List<String> messages = imapClient.fetchUnreadMessages();
        // for (String raw : messages) {
        //    intake.createFromEmail(tenantId, raw);
        // }
    }
}