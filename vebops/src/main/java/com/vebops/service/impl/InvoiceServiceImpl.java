package com.vebops.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;

import java.math.BigDecimal;
import java.util.List;
import java.util.function.Predicate;

import com.vebops.service.InvoiceService;
import com.vebops.service.TenantGuard;
import com.vebops.service.EmailService;
import com.vebops.repository.*;
import com.vebops.domain.*;
import com.vebops.domain.enums.*;
import com.vebops.util.CodeGenerators;

@Service
public class InvoiceServiceImpl implements InvoiceService {

    private final TenantGuard tenantGuard;
    private final EmailService emailService;
    private final InvoiceRepository invRepo;
    private final InvoiceLineRepository invLineRepo;
    private final WorkOrderRepository woRepo;
    private final WorkOrderItemRepository woItemRepo;
    private final ProposalItemRepository propItemRepo;

    // Mail sender to deliver PDF invoices via email
    private final JavaMailSender mailSender;

    public InvoiceServiceImpl(TenantGuard tenantGuard,
                              EmailService emailService,
                              InvoiceRepository invRepo,
                              InvoiceLineRepository invLineRepo,
                              WorkOrderRepository woRepo,
                              WorkOrderItemRepository woItemRepo,
                              ProposalItemRepository propItemRepo,
                              JavaMailSender mailSender) {
        this.tenantGuard = tenantGuard;
        this.emailService = emailService;
        this.invRepo = invRepo;
        this.invLineRepo = invLineRepo;
        this.woRepo = woRepo;
        this.woItemRepo = woItemRepo;
        this.propItemRepo = propItemRepo;
        this.mailSender = mailSender;
    }

    @Override
    @Transactional
    public Invoice generateForWorkOrder(Long tenantId, Long woId) {
        tenantGuard.assertActive(tenantId);
        WorkOrder wo = woRepo.findById(woId).orElseThrow(() -> new RuntimeException("WO not found"));
        Proposal proposal = wo.getServiceRequest().getProposal();

        Invoice inv = new Invoice();
        inv.setTenantId(tenantId);
        // generate invoice no
        Predicate<String> exists = code -> invRepo.findByTenantIdAndInvoiceNo(tenantId, code).isPresent();
        inv.setInvoiceNo(CodeGenerators.unique("INV", exists));
        inv.setWorkOrder(wo);
        inv.setProposal(proposal);
        inv.setCustomer(proposal.getCustomer());
        inv.setStatus(InvoiceStatus.DRAFT);
        invRepo.save(inv);

        BigDecimal subtotal = BigDecimal.ZERO;

        // Material lines from issued quantities
        List<WorkOrderItem> items = woItemRepo.findByTenantIdAndWorkOrder_Id(tenantId, woId);
        for (WorkOrderItem it : items) {
            if (it.getQtyIssued().compareTo(BigDecimal.ZERO) > 0) {
                InvoiceLine line = new InvoiceLine();
                line.setTenantId(tenantId);
                line.setInvoice(inv);
                line.setItem(it.getItem());
                line.setDescription(it.getItem().getName());
                line.setQty(it.getQtyIssued());
                line.setRate(it.getItem().getRate());
                line.setAmount(it.getItem().getRate().multiply(it.getQtyIssued()));
                line.setSource("WO_ITEM");
                line.setSourceId(it.getId());
                invLineRepo.save(line);
                subtotal = subtotal.add(line.getAmount());
            }
        }

        // Service charge heuristic: proposal total - material-only proposal lines
        BigDecimal proposalMaterials = BigDecimal.ZERO;
        for (ProposalItem pi : propItemRepo.findByTenantIdAndProposal_Id(tenantId, proposal.getId())) {
            if (pi.getItem() != null) {
                proposalMaterials = proposalMaterials.add(pi.getAmount());
            }
        }
        BigDecimal serviceCharge = proposal.getTotal() != null ? proposal.getTotal().subtract(proposalMaterials) : BigDecimal.ZERO;
        if (serviceCharge.compareTo(BigDecimal.ZERO) > 0) {
            InvoiceLine svc = new InvoiceLine();
            svc.setTenantId(tenantId);
            svc.setInvoice(inv);
            svc.setDescription("Service Charge");
            svc.setQty(BigDecimal.ONE);
            svc.setRate(serviceCharge);
            svc.setAmount(serviceCharge);
            svc.setSource("SERVICE_CHARGE");
            invLineRepo.save(svc);
            subtotal = subtotal.add(serviceCharge);
        }

        inv.setSubtotal(subtotal);
        inv.setTax(BigDecimal.ZERO);
        inv.setTotal(subtotal);
        return inv;
    }

    @Override
    @Transactional(noRollbackFor = Exception.class)
    public void sendInvoice(Long tenantId, Long invoiceId, String toEmail) {
        tenantGuard.assertActive(tenantId);
        Invoice inv = invRepo.findById(invoiceId).orElseThrow(() -> new RuntimeException("Invoice not found"));
        inv.setStatus(InvoiceStatus.SENT);
        // Build the invoice PDF
        List<InvoiceLine> lines = invLineRepo.findByTenantIdAndInvoice_Id(tenantId, invoiceId);
        byte[] pdfBytes = com.vebops.util.PdfUtil.buildInvoicePdf(inv, lines);
        // Send email with PDF attachment using JavaMailSender
        if (mailSender != null && toEmail != null && !toEmail.isBlank()) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true);
                helper.setTo(toEmail);
                helper.setSubject("Invoice " + inv.getInvoiceNo());
                helper.setText("Please find attached invoice.");
                helper.addAttachment("invoice-" + inv.getInvoiceNo() + ".pdf",
                    new org.springframework.core.io.ByteArrayResource(pdfBytes));
                mailSender.send(message);
            } catch (Exception ex) {
                // swallow exceptions to avoid disrupting business flow
            }
        }
        // Persist email log (without attachment) for audit via EmailService
        emailService.send(tenantId, toEmail, "Invoice " + inv.getInvoiceNo(), "Please find attached invoice.", "INVOICE", inv.getId(), false);
    }

    @Override
    @Transactional(noRollbackFor = Exception.class)
    public void sendInvoiceViaWhatsapp(Long tenantId, Long invoiceId, String toWhatsapp) {
        tenantGuard.assertActive(tenantId);
        Invoice inv = invRepo.findById(invoiceId).orElseThrow(() -> new RuntimeException("Invoice not found"));
        inv.setStatus(InvoiceStatus.SENT);
        // Build the invoice PDF
        List<InvoiceLine> lines = invLineRepo.findByTenantIdAndInvoice_Id(tenantId, invoiceId);
        byte[] pdfBytes = com.vebops.util.PdfUtil.buildInvoicePdf(inv, lines);
        // TODO: integrate with a WhatsApp messaging service (e.g. Twilio) to deliver the PDF.
        // For now we simply log the delivery. A real implementation would upload the PDF
        // to a public URL or attach it directly in the WhatsApp message.
        System.out.println("Sending invoice " + inv.getInvoiceNo() + " via WhatsApp to " + toWhatsapp);
        // Persist a log entry via the existing EmailService for audit. Although this method
        // is named EmailService it provides a generic logging mechanism for outbound
        // communications.
        emailService.send(tenantId, toWhatsapp, "Invoice " + inv.getInvoiceNo(), "Please find attached invoice.", "INVOICE", inv.getId(), false);
    }

    @Override
    @Transactional
    public void markPaid(Long tenantId, Long invoiceId) {
        tenantGuard.assertActive(tenantId);
        Invoice inv = invRepo.findById(invoiceId).orElseThrow(() -> new RuntimeException("Invoice not found"));
        inv.setStatus(InvoiceStatus.PAID);
    }
}
