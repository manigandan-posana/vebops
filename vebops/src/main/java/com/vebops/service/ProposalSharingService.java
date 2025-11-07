package com.vebops.service;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.mail.internet.MimeMessage;

import com.vebops.domain.Customer;
import com.vebops.domain.Document;
import com.vebops.domain.Proposal;
import com.vebops.domain.enums.EmailEntityType;

@Service
public class ProposalSharingService {

    private final JavaMailSender sender;
    private final EmailService emails;
    private final PortalAccountManager portal;

    public ProposalSharingService(JavaMailSender sender, EmailService emails, PortalAccountManager portal){
        this.sender = sender;
        this.emails = emails;
        this.portal = portal;
    }

    /**
     * Ensures the customer has a portal account, sends an email (optionally with PDF attached),
     * and logs the email via EmailService for audit.
     */
    @Transactional
    public void sendToCustomer(Long tenantId, Proposal p, String toEmail, String subject, String htmlBody, boolean attachPdf, Document pdfDoc, byte[] pdfBytes) {
        Customer c = p.getCustomer();
        if (c != null) {
            // Ensure portal user exists (no spam: do not send credentials unless you want to)
            portal.ensureForCustomer(tenantId, c, false);
        }

        // Dispatch MIME email (attachment optional)
        try {
            MimeMessage msg = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, attachPdf, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            if (attachPdf && pdfDoc != null && pdfBytes != null) {
                String fname = pdfDoc.getFilename() != null ? pdfDoc.getFilename() : ("Proposal-P" + p.getId() + ".pdf");
                helper.addAttachment(fname, new org.springframework.core.io.ByteArrayResource(pdfBytes));
            }
            sender.send(msg);
        } catch (Exception e) {
            throw new com.vebops.exception.BusinessException("Failed to send email");
        }

        // Persist log (no attachment in DB log, just the body)
        emails.send(tenantId, toEmail, subject, htmlBody, EmailEntityType.PROPOSAL, p.getId(), false);
        
    }
}
