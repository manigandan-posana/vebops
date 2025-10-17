package com.vebops.util;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.vebops.domain.Invoice;
import com.vebops.domain.InvoiceLine;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.WorkOrderProgress;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public class PdfUtil {

  public static byte[] buildInvoicePdf(Invoice inv, List<InvoiceLine> lines) {
    try {
      ByteArrayOutputStream bout = new ByteArrayOutputStream();
      Document doc = new Document(PageSize.A4, 36,36,36,36);
      PdfWriter.getInstance(doc, bout);
      doc.open();

      Font h1 = new Font(Font.HELVETICA, 16, Font.BOLD);
      Font h2 = new Font(Font.HELVETICA, 12, Font.BOLD);
      Font text = new Font(Font.HELVETICA, 10);

      doc.add(new Paragraph("INVOICE " + inv.getInvoiceNo(), h1));
      doc.add(new Paragraph("Customer: " + inv.getCustomer().getName(), text));
      doc.add(new Paragraph("Work Order: " + inv.getWorkOrder().getWan(), text));
      doc.add(new Paragraph("Date: " + inv.getInvoiceDate(), text));
      doc.add(Chunk.NEWLINE);

      PdfPTable table = new PdfPTable(5);
      table.setWidthPercentage(100);
      table.setWidths(new float[]{40f, 10f, 15f, 15f, 20f});
      addHeader(table, "Description", "Qty", "Rate", "Amount", "Source");

      BigDecimal subtotal = BigDecimal.ZERO;
      for (InvoiceLine l : lines) {
        addRow(table,
          safe(l.getDescription()),
          l.getQty().toPlainString(),
          money(l.getRate()),
          money(l.getAmount()),
          safe(l.getSource()));
        subtotal = subtotal.add(l.getAmount());
      }
      doc.add(table);
      doc.add(Chunk.NEWLINE);

      Paragraph tot = new Paragraph("Total: " + money(subtotal), h2);
      tot.setAlignment(Element.ALIGN_RIGHT);
      doc.add(tot);

      doc.close();
      return bout.toByteArray();
    } catch(Exception e){
      throw new RuntimeException("Failed to build invoice PDF", e);
    }
  }

  private static String safe(String s){ return s==null? "" : s; }
  private static String money(BigDecimal v){
    return (v==null? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP).toPlainString();
  }
  private static void addHeader(PdfPTable t, String... cells){
    for(String c: cells){
      PdfPCell cell = new PdfPCell(new Phrase(c));
      cell.setBackgroundColor(new Color(230,230,230));
      t.addCell(cell);
    }
  }
  private static void addRow(PdfPTable t, String... cells){
    for(String c: cells){ t.addCell(new Phrase(c)); }
  }

  /**
   * Builds a completion report PDF for a given work order. The report
   * summarises the work order details and lists all recorded progress
   * entries. Each progress entry includes the status, remarks, photo URL
   * (if any) and the timestamp when it was recorded. The output is a PDF
   * byte array suitable for direct download.
   *
   * @param wo the work order to report on
   * @param progress the ordered list of progress entries belonging to the work order
   * @return a PDF encoded as a byte array
   */
  public static byte[] buildCompletionReportPdf(WorkOrder wo, java.util.List<WorkOrderProgress> progress) {
    try {
      ByteArrayOutputStream bout = new ByteArrayOutputStream();
      Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
      PdfWriter.getInstance(doc, bout);
      doc.open();
      Font h1 = new Font(Font.HELVETICA, 16, Font.BOLD);
      Font h2 = new Font(Font.HELVETICA, 12, Font.BOLD);
      Font text = new Font(Font.HELVETICA, 10);

      // Header
      doc.add(new Paragraph("WORK ORDER COMPLETION REPORT", h1));
      doc.add(new Paragraph("Work Order: " + wo.getWan(), h2));
      doc.add(new Paragraph("Service Request: " + (wo.getServiceRequest() != null ? wo.getServiceRequest().getSrn() : ""), text));
      doc.add(new Paragraph("Status: " + wo.getStatus(), text));
      doc.add(new Paragraph("Customer: " + (wo.getServiceRequest() != null && wo.getServiceRequest().getCustomer() != null ? wo.getServiceRequest().getCustomer().getName() : ""), text));
      doc.add(Chunk.NEWLINE);

      // Table of progress entries
      PdfPTable table = new PdfPTable(4);
      table.setWidthPercentage(100);
      table.setWidths(new float[]{20f, 40f, 30f, 30f});
      addHeader(table, "Status", "Remarks", "Photo URL", "Timestamp");
      for (WorkOrderProgress p : progress) {
        addRow(table,
          p.getStatus() != null ? p.getStatus().name() : "",
          p.getRemarks() != null ? p.getRemarks() : "",
          p.getPhotoUrl() != null ? p.getPhotoUrl() : "",
          p.getCreatedAt() != null ? p.getCreatedAt().toString() : "");
      }
      doc.add(table);

      doc.close();
      return bout.toByteArray();
    } catch (Exception e) {
      throw new RuntimeException("Failed to build completion report PDF", e);
    }
  }
}
