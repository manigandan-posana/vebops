package com.vebops.util;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.vebops.domain.Invoice;
import com.vebops.domain.InvoiceLine;
import com.vebops.domain.WorkOrder;
import com.vebops.domain.Customer;
import com.vebops.domain.ServiceRequest;
import com.vebops.domain.WorkOrderProgress;
import com.vebops.domain.WorkOrderProgressAttachment;
import com.vebops.domain.PurchaseOrder;
import com.vebops.domain.PurchaseOrderLine;

// Import PdfRendererBuilder for HTML to PDF conversion.  This class comes from the
// openhtmltopdf-pdfbox module and provides a fluent API for converting HTML
// content into a PDF document.  See: https://github.com/danfickle/openhtmltopdf
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.text.NumberFormat;
import java.util.Locale;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Pattern;

public class PdfUtil {

  private static final Logger log = Logger.getLogger(PdfUtil.class.getName());
  private static final String ROBOTO_REGULAR_ALIAS = "vebops-roboto-regular";
  private static final String ROBOTO_BOLD_ALIAS = "vebops-roboto-bold";
  private static volatile boolean ROBOTO_REGISTERED = false;

  private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");
  private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

  private static Font fontRegular(float size) {
    ensureRobotoRegistered();
    Font font = FontFactory.getFont(ROBOTO_REGULAR_ALIAS, BaseFont.IDENTITY_H, BaseFont.EMBEDDED, size, Font.NORMAL, Color.BLACK);
    if (font == null || font.getBaseFont() == null) {
      font = new Font(Font.HELVETICA, size, Font.NORMAL, Color.BLACK);
    }
    return font;
  }

  private static Font fontBold(float size) {
    ensureRobotoRegistered();
    Font font = FontFactory.getFont(ROBOTO_BOLD_ALIAS, BaseFont.IDENTITY_H, BaseFont.EMBEDDED, size, Font.BOLD, Color.BLACK);
    if (font == null || font.getBaseFont() == null) {
      font = new Font(Font.HELVETICA, size, Font.BOLD, Color.BLACK);
    }
    return font;
  }

  private static synchronized void ensureRobotoRegistered() {
    if (ROBOTO_REGISTERED) {
      return;
    }
    boolean regular = registerFontCandidate(ROBOTO_REGULAR_ALIAS,
        "fonts/Roboto-Regular.ttf",
        "src/main/resources/fonts/Roboto-Regular.ttf",
        "vebops/src/main/resources/fonts/Roboto-Regular.ttf",
        "Roboto-Regular.ttf");
    boolean bold = registerFontCandidate(ROBOTO_BOLD_ALIAS,
        "fonts/Roboto-Bold.ttf",
        "src/main/resources/fonts/Roboto-Bold.ttf",
        "vebops/src/main/resources/fonts/Roboto-Bold.ttf",
        "Roboto-Bold.ttf");
    if (!regular || !bold) {
      log.log(Level.FINE, "Roboto font files not found on classpath; falling back to Helvetica");
    }
    ROBOTO_REGISTERED = true;
  }

  private static boolean registerFontCandidate(String alias, String... candidates) {
    ClassLoader cl = PdfUtil.class.getClassLoader();
    for (String candidate : candidates) {
      if (candidate == null || candidate.isBlank()) {
        continue;
      }
      String normalized = candidate.startsWith("/") ? candidate.substring(1) : candidate;
      try (InputStream resource = cl.getResourceAsStream(normalized)) {
        if (resource != null) {
          Path temp = Files.createTempFile("vebops-font-", ".ttf");
          Files.copy(resource, temp, StandardCopyOption.REPLACE_EXISTING);
          FontFactory.register(temp.toAbsolutePath().toString(), alias);
          Files.deleteIfExists(temp);
          return true;
        }
      } catch (Exception ex) {
        log.log(Level.FINEST, "Unable to register Roboto font from classpath candidate {0}", candidate);
      }

      try {
        Path absolute = pathJoin(normalized).toAbsolutePath();
        if (Files.exists(absolute)) {
          FontFactory.register(absolute.toString(), alias);
          return true;
        }
      } catch (Exception ex) {
        log.log(Level.FINEST, "Unable to register Roboto font from filesystem candidate {0}", candidate);
      }
    }
    return false;
  }

  private static Path pathJoin(String first, String... more) {
    if (first == null) {
      first = "";
    }
    Path path = Path.of(first);
    if (more != null) {
      for (String part : more) {
        if (part != null && !part.isBlank()) {
          path = path.resolve(part);
        }
      }
    }
    if (!path.isAbsolute()) {
      path = Path.of(System.getProperty("user.dir", ".")).resolve(path);
    }
    return path;
  }

  private static PdfPCell infoBlock(String title, Map<String, String> rows, Font titleFont, Font labelFont, Font valueFont) {
    PdfPCell container = new PdfPCell();
    container.setBorderColor(new Color(222, 226, 230));
    container.setBorderWidth(0.6f);
    container.setPadding(10f);

    Paragraph heading = new Paragraph(displayLabel(title), titleFont);
    heading.setSpacingAfter(6f);
    container.addElement(heading);

    PdfPTable inner = new PdfPTable(new float[]{1f, 1.4f});
    inner.setWidthPercentage(100);
    inner.getDefaultCell().setBorder(Rectangle.NO_BORDER);
    if (rows != null) {
      for (Map.Entry<String, String> entry : rows.entrySet()) {
        inner.addCell(detailLabelCell(entry.getKey(), labelFont));
        inner.addCell(detailValueCell(entry.getValue(), valueFont));
      }
    }
    container.addElement(inner);
    return container;
  }

  private static PdfPCell detailLabelCell(String label, Font labelFont) {
    PdfPCell cell = new PdfPCell(new Phrase(displayLabel(label), labelFont));
    cell.setBorder(Rectangle.NO_BORDER);
    cell.setPadding(2f);
    return cell;
  }

  private static PdfPCell detailValueCell(String value, Font valueFont) {
    PdfPCell cell = new PdfPCell(new Phrase(valueOrDash(value), valueFont));
    cell.setBorder(Rectangle.NO_BORDER);
    cell.setPadding(2f);
    return cell;
  }

  private static String combineAddress(String... parts) {
    if (parts == null) {
      return "";
    }
    StringBuilder sb = new StringBuilder();
    for (String part : parts) {
      String cleaned = safe(part);
      if (cleaned.isEmpty()) {
        continue;
      }
      if (sb.length() > 0) {
        sb.append('\n');
      }
      sb.append(cleaned);
    }
    return sb.toString();
  }

  private static String displayLabel(String raw) {
    return safe(raw).isEmpty() ? "—" : safe(raw);
  }

  private static String valueOrDash(String raw) {
    String value = safe(raw);
    return value.isEmpty() ? "—" : value;
  }

  private static String formatDate(Object value) {
    if (value == null) {
      return "—";
    }
    if (value instanceof java.util.Date date) {
      return DATE_FMT.format(date.toInstant().atZone(ZoneId.systemDefault()).toLocalDate());
    }
    if (value instanceof LocalDate localDate) {
      return DATE_FMT.format(localDate);
    }
    if (value instanceof LocalDateTime localDateTime) {
      return DATE_FMT.format(localDateTime);
    }
    if (value instanceof OffsetDateTime offset) {
      return DATE_FMT.format(offset.toLocalDate());
    }
    if (value instanceof Instant instant) {
      return DATE_FMT.format(ZonedDateTime.ofInstant(instant, ZoneId.systemDefault()));
    }
    return safe(value);
  }

  private static String formatDateTime(Object value) {
    if (value == null) {
      return "—";
    }
    if (value instanceof java.util.Date date) {
      return DATE_TIME_FMT.format(date.toInstant().atZone(ZoneId.systemDefault()));
    }
    if (value instanceof LocalDateTime localDateTime) {
      return DATE_TIME_FMT.format(localDateTime);
    }
    if (value instanceof OffsetDateTime offset) {
      return DATE_TIME_FMT.format(offset.atZoneSameInstant(ZoneId.systemDefault()));
    }
    if (value instanceof Instant instant) {
      return DATE_TIME_FMT.format(ZonedDateTime.ofInstant(instant, ZoneId.systemDefault()));
    }
    if (value instanceof LocalDate localDate) {
      return DATE_TIME_FMT.format(localDate.atStartOfDay());
    }
    return safe(value);
  }

  private static void addTableHeader(PdfPTable table, Font font, String... headers) {
    if (headers == null) {
      return;
    }
    for (String header : headers) {
      PdfPCell cell = new PdfPCell(new Phrase(displayLabel(header), font));
      cell.setHorizontalAlignment(Element.ALIGN_CENTER);
      cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
      cell.setBackgroundColor(new Color(242, 242, 242));
      cell.setPadding(6f);
      cell.setBorderColor(new Color(214, 219, 223));
      table.addCell(cell);
    }
  }

  private static PdfPCell bodyCell(String text, Font font, int align) {
    PdfPCell cell = new PdfPCell(new Phrase(valueOrDash(text), font));
    cell.setHorizontalAlignment(align);
    cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
    cell.setPadding(6f);
    cell.setBorderColor(new Color(230, 230, 230));
    return cell;
  }

  private static PdfPCell summaryLabel(String text, Font font) {
    PdfPCell cell = new PdfPCell(new Phrase(displayLabel(text), font));
    cell.setBorderColor(new Color(224, 224, 224));
    cell.setPadding(6f);
    cell.setHorizontalAlignment(Element.ALIGN_LEFT);
    return cell;
  }

  private static PdfPCell summaryValue(String text, Font font) {
    PdfPCell cell = new PdfPCell(new Phrase(valueOrDash(text), font));
    cell.setBorderColor(new Color(224, 224, 224));
    cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
    cell.setPadding(6f);
    return cell;
  }

  private static String formatQuantity(BigDecimal qty) {
    if (qty == null) {
      return "0";
    }
    BigDecimal normalized = qty.stripTrailingZeros();
    if (normalized.scale() < 0) {
      normalized = normalized.setScale(0, RoundingMode.UNNECESSARY);
    }
    return normalized.toPlainString();
  }

  private static String formatCurrency(BigDecimal value) {
    if (value == null) {
      value = BigDecimal.ZERO;
    }
    BigDecimal scaled = value.setScale(2, RoundingMode.HALF_UP);
    NumberFormat fmt = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
    fmt.setMinimumFractionDigits(2);
    fmt.setMaximumFractionDigits(2);
    return fmt.format(scaled);
  }

  private static String formatPercent(BigDecimal value) {
    if (value == null) {
      return "0%";
    }
    BigDecimal scaled = value.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros();
    return scaled.toPlainString() + "%";
  }

  private static BigDecimal parseDecimal(Object value) {
    if (value == null) {
      return BigDecimal.ZERO;
    }
    if (value instanceof BigDecimal decimal) {
      return decimal;
    }
    if (value instanceof Number number) {
      return new BigDecimal(number.toString());
    }
    if (value instanceof String str) {
      String cleaned = str.replaceAll("[^0-9.-]", "");
      if (cleaned.isBlank()) {
        return BigDecimal.ZERO;
      }
      try {
        return new BigDecimal(cleaned);
      } catch (NumberFormatException ignored) {
        return BigDecimal.ZERO;
      }
    }
    return BigDecimal.ZERO;
  }

  private static boolean hasAmount(BigDecimal value) {
    return value != null && value.compareTo(BigDecimal.ZERO) != 0;
  }

  private static String rateLabel(BigDecimal rate) {
    if (rate == null) {
      return "0";
    }
    BigDecimal normalized = rate.stripTrailingZeros();
    return normalized.toPlainString();
  }

  private static String formatState(String stateName, String stateCode) {
    String name = safe(stateName);
    String code = safe(stateCode).replaceAll("[^0-9A-Z]", "");
    if (!name.isEmpty() && !code.isEmpty()) {
      return name + " (" + code + ")";
    }
    if (!name.isEmpty()) {
      return name;
    }
    if (!code.isEmpty()) {
      return code;
    }
    return "—";
  }

  private static void addDetailRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
    table.addCell(detailLabelCell(label, labelFont));
    table.addCell(detailValueCell(value, valueFont));
  }

  private static String assignedEngineerName(WorkOrder wo) {
    if (wo == null) {
      return "";
    }
    if (wo.getAssignedFE() != null) {
      String name = safe(wo.getAssignedFE().getName());
      if (!name.isEmpty()) {
        return name;
      }
      if (wo.getAssignedFE().getUser() != null) {
        return safe(wo.getAssignedFE().getUser().getDisplayName());
      }
    }
    if (wo.getAssignedTeam() != null) {
      return safe(wo.getAssignedTeam().getName());
    }
    return "";
  }

  private static String resolveSiteAddress(WorkOrder wo, ServiceRequest sr) {
    ServiceRequest effective = sr != null ? sr : (wo != null ? wo.getServiceRequest() : null);
    if (effective != null) {
      String site = safe(effective.getSiteAddress());
      if (!site.isEmpty()) {
        return site;
      }
      if (effective.getCustomer() != null) {
        String addr = safe(effective.getCustomer().getAddress());
        if (!addr.isEmpty()) {
          return addr;
        }
      }
    }
    return "—";
  }

  private static String safe(Object value) {
    if (value == null) {
      return "";
    }
    return value.toString().trim();
  }

  public static byte[] buildInvoicePdf(Invoice inv, List<InvoiceLine> lines) {
    if (inv == null) {
      return new byte[0];
    }
    try {
      ByteArrayOutputStream bout = new ByteArrayOutputStream();
      Document doc = new Document(PageSize.A4, 36, 36, 48, 36);
      PdfWriter.getInstance(doc, bout);
      doc.open();

      Font titleFont = fontBold(16f);
      Font sectionFont = fontBold(11f);
      Font labelFont = fontBold(9f);
      Font valueFont = fontRegular(9f);
      Font noteFont = fontRegular(8f);

      WorkOrder wo = inv.getWorkOrder();
      ServiceRequest sr = wo != null ? wo.getServiceRequest() : null;
      Customer customer = inv.getCustomer();

      Paragraph heading = new Paragraph("TAX INVOICE", titleFont);
      heading.setAlignment(Element.ALIGN_RIGHT);
      heading.setSpacingAfter(12f);
      doc.add(heading);

      PdfPTable header = new PdfPTable(new float[]{1.2f, 1f});
      header.setWidthPercentage(100);
      header.setSpacingAfter(12f);

      Map<String, String> billTo = new LinkedHashMap<>();
      billTo.put("Customer", customer != null ? customer.getName() : "");
      billTo.put("Address", customer != null ? customer.getAddress() : "");
      billTo.put("Email", customer != null ? customer.getEmail() : "");
      billTo.put("Phone", customer != null ? customer.getMobile() : "");
      header.addCell(infoBlock("Bill To", billTo, sectionFont, labelFont, valueFont));

      Map<String, String> meta = new LinkedHashMap<>();
      meta.put("Invoice No.", inv.getInvoiceNo());
      meta.put("Invoice Date", formatDate(inv.getInvoiceDate()));
      meta.put("Status", inv.getStatus() != null ? inv.getStatus().name().replace('_', ' ') : "");
      meta.put("Work Order", wo != null ? wo.getWan() : "");
      meta.put("Service Request", sr != null ? sr.getSrn() : "");
      header.addCell(infoBlock("Invoice Details", meta, sectionFont, labelFont, valueFont));
      doc.add(header);

      if (wo != null || sr != null) {
        PdfPTable references = new PdfPTable(new float[]{1f, 1f});
        references.setWidthPercentage(100);
        references.setSpacingAfter(14f);

        Map<String, String> project = new LinkedHashMap<>();
        project.put("Service Type", sr != null && sr.getServiceType() != null
            ? sr.getServiceType().name().replace('_', ' ')
            : "");
        project.put("Site Address", resolveSiteAddress(wo, sr));
        project.put("Customer PO", wo != null && wo.getCustomerPO() != null
            ? wo.getCustomerPO().getPoNumber()
            : "");
        references.addCell(infoBlock("Project Reference", project, sectionFont, labelFont, valueFont));

        Map<String, String> contacts = new LinkedHashMap<>();
        contacts.put("Assigned Engineer", assignedEngineerName(wo));
        contacts.put("Generated On", formatDateTime(java.time.LocalDateTime.now()));
        references.addCell(infoBlock("Coordination", contacts, sectionFont, labelFont, valueFont));
        doc.add(references);
      }

      PdfPTable lineTable = new PdfPTable(new float[]{3.6f, 0.8f, 1.1f, 1.1f});
      lineTable.setWidthPercentage(100);
      addTableHeader(lineTable, labelFont,
          "Description", "Qty", "Rate (₹)", "Amount (₹)");

      BigDecimal subtotal = BigDecimal.ZERO;
      if (lines != null && !lines.isEmpty()) {
        for (InvoiceLine l : lines) {
          BigDecimal qty = l.getQty() != null ? l.getQty() : BigDecimal.ZERO;
          BigDecimal rate = l.getRate() != null ? l.getRate() : BigDecimal.ZERO;
          BigDecimal amount = l.getAmount() != null ? l.getAmount() : qty.multiply(rate);
          subtotal = subtotal.add(amount);

          lineTable.addCell(bodyCell(l.getDescription(), valueFont, Element.ALIGN_LEFT));
          lineTable.addCell(bodyCell(formatQuantity(qty), valueFont, Element.ALIGN_RIGHT));
          lineTable.addCell(bodyCell(formatCurrency(rate), valueFont, Element.ALIGN_RIGHT));
          lineTable.addCell(bodyCell(formatCurrency(amount), valueFont, Element.ALIGN_RIGHT));
        }
      } else {
        PdfPCell empty = bodyCell("No invoice lines available", valueFont, Element.ALIGN_LEFT);
        empty.setColspan(4);
        lineTable.addCell(empty);
      }
      lineTable.setSpacingAfter(12f);
      doc.add(lineTable);

      BigDecimal tax = inv.getTax() != null ? inv.getTax() : BigDecimal.ZERO;
      BigDecimal recordedSubtotal = inv.getSubtotal() != null ? inv.getSubtotal() : subtotal;
      if (recordedSubtotal.compareTo(BigDecimal.ZERO) > 0) {
        subtotal = recordedSubtotal;
      }
      BigDecimal total = inv.getTotal() != null ? inv.getTotal() : subtotal.add(tax);

      PdfPTable totals = new PdfPTable(new float[]{1.4f, 1f});
      totals.setWidthPercentage(45);
      totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
      totals.setSpacingAfter(8f);
      totals.addCell(summaryLabel("Subtotal", labelFont));
      totals.addCell(summaryValue(formatCurrency(subtotal), valueFont));
      totals.addCell(summaryLabel("GST", labelFont));
      totals.addCell(summaryValue(formatCurrency(tax), valueFont));
      totals.addCell(summaryLabel("Grand Total", labelFont));
      totals.addCell(summaryValue(formatCurrency(total), valueFont));
      doc.add(totals);

      Paragraph wordsHeading = new Paragraph("Amount in words", sectionFont);
      wordsHeading.setSpacingBefore(6f);
      wordsHeading.setSpacingAfter(2f);
      doc.add(wordsHeading);
      String amountWords = com.vebops.util.Words.inIndianSystem(total.setScale(2, RoundingMode.HALF_UP));
      doc.add(new Paragraph(amountWords + " only", valueFont));

      Paragraph note = new Paragraph(
          "All cabling and wiring installations have been completed to the agreed specifications. " +
          "Please review the bill of quantities above and remit payment within the agreed credit period.",
          noteFont);
      note.setSpacingBefore(12f);
      note.setSpacingAfter(18f);
      doc.add(note);

      PdfPTable signature = new PdfPTable(new float[]{1f, 1f});
      signature.setWidthPercentage(100);
      signature.getDefaultCell().setBorder(Rectangle.NO_BORDER);

      Paragraph assurance = new Paragraph(
          "Certified by: Cable & Wiring Installation Team",
          valueFont);
      assurance.setSpacingAfter(6f);
      PdfPCell assuranceCell = new PdfPCell(assurance);
      assuranceCell.setBorder(Rectangle.NO_BORDER);
      signature.addCell(assuranceCell);

      Paragraph sign = new Paragraph("Authorised Signatory", labelFont);
      sign.setAlignment(Element.ALIGN_RIGHT);
      Paragraph line = new Paragraph("______________________________", valueFont);
      line.setAlignment(Element.ALIGN_RIGHT);
      PdfPCell signCell = new PdfPCell();
      signCell.setBorder(Rectangle.NO_BORDER);
      signCell.addElement(line);
      signCell.addElement(sign);
      signature.addCell(signCell);
      doc.add(signature);

      doc.close();
      return bout.toByteArray();
    } catch (Exception e) {
      throw new RuntimeException("Failed to build invoice PDF", e);
    }
  }

  public static byte[] buildPurchaseOrderPdf(PurchaseOrder po, List<PurchaseOrderLine> lines) {
    if (po == null) {
      return new byte[0];
    }
    try {
      ByteArrayOutputStream bout = new ByteArrayOutputStream();
      Document doc = new Document(PageSize.A4, 40, 40, 54, 40);
      PdfWriter.getInstance(doc, bout);
      doc.open();

      Font titleFont = fontBold(16f);
      Font sectionFont = fontBold(11f);
      Font labelFont = fontBold(9f);
      Font valueFont = fontRegular(9f);
      Font noteFont = fontRegular(8f);

      Paragraph heading = new Paragraph("PURCHASE ORDER", titleFont);
      heading.setAlignment(Element.ALIGN_RIGHT);
      heading.setSpacingAfter(12f);
      doc.add(heading);

      PdfPTable parties = new PdfPTable(new float[]{1f, 1f});
      parties.setWidthPercentage(100);
      parties.setSpacingAfter(12f);

      Map<String, String> buyer = new LinkedHashMap<>();
      buyer.put("Company", po.getBuyerName());
      buyer.put("Address", po.getBuyerAddress());
      buyer.put("GSTIN", po.getBuyerGstin());
      buyer.put("State", formatState(po.getBuyerStateName(), po.getBuyerStateCode()));
      buyer.put("Phone", po.getBuyerPhone());
      buyer.put("Email", po.getBuyerEmail());
      parties.addCell(infoBlock("Buyer", buyer, sectionFont, labelFont, valueFont));

      Map<String, String> supplier = new LinkedHashMap<>();
      supplier.put("Supplier", po.getSupplierName());
      supplier.put("Address", po.getSupplierAddress());
      supplier.put("GSTIN", po.getSupplierGstin());
      supplier.put("State", formatState(po.getSupplierStateName(), po.getSupplierStateCode()));
      supplier.put("Email", po.getSupplierEmail());
      supplier.put("Whatsapp", po.getSupplierWhatsapp());
      parties.addCell(infoBlock("Supplier", supplier, sectionFont, labelFont, valueFont));
      doc.add(parties);

      PdfPTable references = new PdfPTable(new float[]{1f, 1f});
      references.setWidthPercentage(100);
      references.setSpacingAfter(14f);

      Map<String, String> orderDetails = new LinkedHashMap<>();
      orderDetails.put("Voucher No.", po.getVoucherNumber());
      orderDetails.put("Order Date", formatDate(po.getOrderDate()));
      orderDetails.put("Reference", po.getReferenceNumberAndDate());
      orderDetails.put("Payment Terms", po.getPaymentTerms());
      references.addCell(infoBlock("Order Details", orderDetails, sectionFont, labelFont, valueFont));

      Map<String, String> logistics = new LinkedHashMap<>();
      logistics.put("Dispatched Through", po.getDispatchedThrough());
      logistics.put("Destination", po.getDestination());
      logistics.put("Other References", po.getOtherReferences());
      logistics.put("Terms of Delivery", po.getTermsOfDelivery());
      references.addCell(infoBlock("Logistics", logistics, sectionFont, labelFont, valueFont));
      doc.add(references);

      PdfPTable lineTable = new PdfPTable(new float[]{0.7f, 3.6f, 0.9f, 0.9f, 1.1f, 1.2f});
      lineTable.setWidthPercentage(100);
      addTableHeader(lineTable, labelFont,
          "#", "Description", "Quantity", "Unit", "Rate (₹)", "Amount (₹)");

      int index = 1;
      if (lines != null && !lines.isEmpty()) {
        for (PurchaseOrderLine line : lines) {
          lineTable.addCell(bodyCell(String.valueOf(index++), valueFont, Element.ALIGN_CENTER));
          lineTable.addCell(bodyCell(line.getDescription(), valueFont, Element.ALIGN_LEFT));
          lineTable.addCell(bodyCell(formatQuantity(line.getQuantity()), valueFont, Element.ALIGN_RIGHT));
          lineTable.addCell(bodyCell(line.getUnit(), valueFont, Element.ALIGN_CENTER));
          lineTable.addCell(bodyCell(formatCurrency(line.getRate()), valueFont, Element.ALIGN_RIGHT));
          lineTable.addCell(bodyCell(formatCurrency(line.getAmount()), valueFont, Element.ALIGN_RIGHT));
        }
      } else {
        PdfPCell empty = bodyCell("No line items captured", valueFont, Element.ALIGN_LEFT);
        empty.setColspan(6);
        lineTable.addCell(empty);
      }
      lineTable.setSpacingAfter(12f);
      doc.add(lineTable);

      PdfPTable totals = new PdfPTable(new float[]{1.5f, 1f});
      totals.setWidthPercentage(45);
      totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
      totals.setSpacingAfter(10f);

      totals.addCell(summaryLabel("Subtotal", labelFont));
      totals.addCell(summaryValue(formatCurrency(po.getSubTotal()), valueFont));
      if (hasAmount(po.getCgstAmount())) {
        totals.addCell(summaryLabel("CGST " + rateLabel(po.getCgstRate()) + "%", labelFont));
        totals.addCell(summaryValue(formatCurrency(po.getCgstAmount()), valueFont));
      }
      if (hasAmount(po.getSgstAmount())) {
        totals.addCell(summaryLabel("SGST " + rateLabel(po.getSgstRate()) + "%", labelFont));
        totals.addCell(summaryValue(formatCurrency(po.getSgstAmount()), valueFont));
      }
      if (hasAmount(po.getIgstAmount())) {
        totals.addCell(summaryLabel("IGST " + rateLabel(po.getIgstRate()) + "%", labelFont));
        totals.addCell(summaryValue(formatCurrency(po.getIgstAmount()), valueFont));
      }
      totals.addCell(summaryLabel("Grand Total", labelFont));
      totals.addCell(summaryValue(formatCurrency(po.getGrandTotal()), valueFont));
      doc.add(totals);

      Paragraph amountWords = new Paragraph(
          "Amount chargeable (in words): " + (po.getAmountInWords() == null ? "—" : po.getAmountInWords()),
          valueFont);
      amountWords.setSpacingAfter(12f);
      doc.add(amountWords);

      Paragraph note = new Paragraph(
          "Procurement covers cabling and wiring materials as per approved schedules. Supplier must ensure brand-specific packaging and deliver items without damage.",
          noteFont);
      note.setSpacingAfter(18f);
      doc.add(note);

      PdfPTable footer = new PdfPTable(new float[]{1f, 1f});
      footer.setWidthPercentage(100);
      footer.getDefaultCell().setBorder(Rectangle.NO_BORDER);

      Paragraph left = new Paragraph("Company PAN: " + (po.getCompanyPan() == null ? "—" : po.getCompanyPan()), valueFont);
      left.add(Chunk.NEWLINE);
      left.add(new Chunk("This document is system generated.", noteFont));
      PdfPCell leftCell = new PdfPCell(left);
      leftCell.setBorder(Rectangle.NO_BORDER);
      footer.addCell(leftCell);

      Paragraph right = new Paragraph();
      right.add(new Chunk("For " + (po.getBuyerName() == null ? "" : po.getBuyerName()), valueFont));
      right.add(Chunk.NEWLINE);
      right.add(Chunk.NEWLINE);
      right.add(new Chunk("Authorised Signatory", labelFont));
      PdfPCell rightCell = new PdfPCell(right);
      rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
      rightCell.setBorder(Rectangle.NO_BORDER);
      footer.addCell(rightCell);

      doc.add(footer);

      doc.close();
      return bout.toByteArray();
    } catch (Exception e) {
      throw new RuntimeException("Failed to build purchase order PDF", e);
    }
  }

  /**
   * Builds a PDF invoice for an ad-hoc Service entity. Unlike the work order
   * invoice which relies on Invoice/InvoiceLine domain objects this method
   * accepts the raw service and accompanying payload structures. The
   * resulting PDF contains a minimal header with tenant/company details
   * (when supplied), buyer/consignee information and a tabular breakdown
   * of each item with quantity, rate, and amount. Totals are
   * computed from the provided structures. If company is null the seller
   * section will be omitted. Caller must ensure the input maps are non‑null
   * but empty maps/lists are allowed.
   *
   * @param svc      the Service entity containing buyer/consignee fields
   * @param meta     the deserialised meta section (may contain invoiceNo, serviceType, etc.)
   * @param items    the deserialised list of item maps (each with basePrice, qty, discount, name, hsnSac)
   * @param totals   the deserialised totals section (optional, used for grand total)
   * @param company  the tenant’s CompanyDetails for seller info (nullable)
   * @return a PDF encoded as a byte array or an empty array if generation fails
   */
  public static byte[] buildServiceInvoicePdf(
      com.vebops.domain.Service svc,
      java.util.Map<String, Object> meta,
      java.util.List<java.util.Map<String, Object>> items,
      java.util.Map<String, Object> totals,
      com.vebops.domain.CompanyDetails company) {
    if (svc == null) {
      return new byte[0];
    }
    try {
      java.io.ByteArrayOutputStream bout = new java.io.ByteArrayOutputStream();
      com.lowagie.text.Document doc = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4, 36, 36, 48, 36);
      com.lowagie.text.pdf.PdfWriter.getInstance(doc, bout);
      doc.open();

      Font titleFont = fontBold(16f);
      Font sectionFont = fontBold(11f);
      Font labelFont = fontBold(9f);
      Font valueFont = fontRegular(9f);
      Font noteFont = fontRegular(8f);

      String declaredDocType = meta != null && meta.get("docType") != null
          ? String.valueOf(meta.get("docType")).trim().toUpperCase()
          : "";
      String invoiceNo = cleanDocNumber(meta != null ? meta.get("invoiceNo") : null);
      String invoiceDate = meta != null && meta.get("invoiceDate") != null ? String.valueOf(meta.get("invoiceDate")).trim() : "";
      String pinvNo = cleanDocNumber(meta != null ? meta.get("pinvNo") : null);
      String pinvDate = meta != null && meta.get("pinvDate") != null ? String.valueOf(meta.get("pinvDate")).trim() : "";

      boolean explicitProforma = "PROFORMA".equals(declaredDocType) || "PINV".equals(declaredDocType);
      boolean explicitInvoice = "INVOICE".equals(declaredDocType);
      boolean isProforma = explicitProforma || (!explicitInvoice && (!pinvNo.isBlank() || !pinvDate.isBlank()));

      String docTitle = isProforma ? "PROFORMA INVOICE" : "SERVICE INVOICE";
      String docNoLabel = isProforma ? "PINV No." : "Invoice No.";
      String docDateLabel = isProforma ? "PINV Date" : "Invoice Date";
      String docNoValue = isProforma
          ? (!pinvNo.isBlank() ? pinvNo : (!invoiceNo.isBlank() ? invoiceNo : "—"))
          : (!invoiceNo.isBlank() ? invoiceNo : (!pinvNo.isBlank() ? pinvNo : "—"));
      String docDateValue = isProforma
          ? (!pinvDate.isBlank() ? pinvDate : (!invoiceDate.isBlank() ? invoiceDate : "—"))
          : (!invoiceDate.isBlank() ? invoiceDate : (!pinvDate.isBlank() ? pinvDate : "—"));

      String serviceTypeVal = meta != null && meta.get("serviceType") != null ? String.valueOf(meta.get("serviceType")) : "";
      String buyerOrderNo = meta != null && meta.get("buyerOrderNo") != null ? String.valueOf(meta.get("buyerOrderNo")) : "";
      String orderDate = meta != null && meta.get("orderDate") != null ? String.valueOf(meta.get("orderDate")) : "";
      String dcNo = meta != null && meta.get("dcNo") != null
          ? String.valueOf(meta.get("dcNo"))
          : (meta != null && meta.get("deliveryChallanNo") != null ? String.valueOf(meta.get("deliveryChallanNo")) : "");
      String wcNo = meta != null && meta.get("wcNo") != null
          ? String.valueOf(meta.get("wcNo"))
          : (meta != null && meta.get("workCompletionCertNo") != null ? String.valueOf(meta.get("workCompletionCertNo")) : "");
      String projectName = meta != null && meta.get("projectName") != null ? String.valueOf(meta.get("projectName")) : "";

      String placeOfSupply = meta != null && meta.get("placeOfSupply") != null
          ? String.valueOf(meta.get("placeOfSupply"))
          : "";
      if ((placeOfSupply == null || placeOfSupply.isBlank()) && company != null) {
        placeOfSupply = company.getState();
      }
      if (placeOfSupply == null || placeOfSupply.isBlank()) {
        placeOfSupply = "—";
      }

      PdfPTable header = new PdfPTable(new float[]{1.3f, 1f});
      header.setWidthPercentage(100);
      header.setSpacingAfter(12f);

      java.util.Map<String, String> seller = new java.util.LinkedHashMap<>();
      if (company != null) {
        seller.put("Company", company.getName());
        seller.put("Address", combineAddress(company.getAddressLine1(), company.getAddressLine2()));
        seller.put("GSTIN", company.getGstin());
        seller.put("PAN", company.getPan());
        seller.put("Phone", company.getPhone());
        seller.put("Email", company.getEmail());
      } else {
        seller.put("Company", "Cable & Wiring Installation Services");
        seller.put("Address", "—");
      }
      header.addCell(infoBlock("Seller", seller, sectionFont, labelFont, valueFont));

      java.util.Map<String, String> docMeta = new java.util.LinkedHashMap<>();
      docMeta.put(docNoLabel, docNoValue);
      docMeta.put(docDateLabel, docDateValue);
      docMeta.put("Service Type", serviceTypeVal);
      docMeta.put("Place of Supply", placeOfSupply);
      docMeta.put("Project", projectName);
      header.addCell(infoBlock(docTitle, docMeta, sectionFont, labelFont, valueFont));
      doc.add(header);
      PdfPTable parties = new PdfPTable(new float[]{1f, 1f});
      parties.setWidthPercentage(100);
      parties.setSpacingAfter(12f);

      java.util.Map<String, String> billTo = new java.util.LinkedHashMap<>();
      billTo.put("Name", svc.getBuyerName());
      billTo.put("Address", svc.getBuyerAddress());
      billTo.put("State", svc.getBuyerState());
      billTo.put("PIN", svc.getBuyerPin());
      billTo.put("GSTIN", svc.getBuyerGst());
      billTo.put("Contact", svc.getBuyerContact());
      billTo.put("Email", svc.getBuyerEmail());
      parties.addCell(infoBlock("Bill To", billTo, sectionFont, labelFont, valueFont));

      java.util.Map<String, String> shipTo = new java.util.LinkedHashMap<>();
      shipTo.put("Name", svc.getConsigneeName());
      shipTo.put("Address", svc.getConsigneeAddress());
      shipTo.put("State", svc.getConsigneeState());
      shipTo.put("PIN", svc.getConsigneePin());
      shipTo.put("GSTIN", svc.getConsigneeGst());
      parties.addCell(infoBlock("Ship To", shipTo, sectionFont, labelFont, valueFont));
      doc.add(parties);

      PdfPTable references = new PdfPTable(new float[]{1f, 1f});
      references.setWidthPercentage(100);
      references.setSpacingAfter(14f);

      java.util.Map<String, String> referenceLeft = new java.util.LinkedHashMap<>();
      referenceLeft.put("Buyer PO", buyerOrderNo);
      referenceLeft.put("Order Date", orderDate);
      referenceLeft.put("Delivery Challan", dcNo);
      referenceLeft.put("Completion Certificate", wcNo);
      references.addCell(infoBlock("Project References", referenceLeft, sectionFont, labelFont, valueFont));

      java.util.Map<String, String> referenceRight = new java.util.LinkedHashMap<>();
      referenceRight.put("Site", placeOfSupply);
      referenceRight.put("Service Type", serviceTypeVal);
      referenceRight.put("Project", projectName);
      referenceRight.put("Generated", formatDateTime(java.time.LocalDateTime.now()));
      references.addCell(infoBlock("Execution Details", referenceRight, sectionFont, labelFont, valueFont));
      doc.add(references);

      PdfPTable itemsTable = new PdfPTable(new float[]{3.2f, 1.1f, 0.8f, 1.1f, 0.8f, 1.2f});
      itemsTable.setWidthPercentage(100);
      addTableHeader(itemsTable, labelFont,
          "Description", "HSN/SAC", "Qty", "Rate (₹)", "Disc %", "Amount (₹)");

      java.math.BigDecimal grossTotal = java.math.BigDecimal.ZERO;
      java.math.BigDecimal discountSavings = java.math.BigDecimal.ZERO;
      java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;

      if (items != null && !items.isEmpty()) {
        for (java.util.Map<String, Object> it : items) {
          if (it == null) {
            continue;
          }
          String desc = it.get("name") != null ? String.valueOf(it.get("name")) : "";
          String hsn = it.get("hsnSac") != null ? String.valueOf(it.get("hsnSac")) : "";
          java.math.BigDecimal qty = parseDecimal(it.get("qty"));
          java.math.BigDecimal rate = parseDecimal(it.get("basePrice"));
          java.math.BigDecimal discountPct = parseDecimal(it.get("discount"));
          if (qty.compareTo(java.math.BigDecimal.ZERO) < 0) qty = java.math.BigDecimal.ZERO;
          if (rate.compareTo(java.math.BigDecimal.ZERO) < 0) rate = java.math.BigDecimal.ZERO;
          if (discountPct.compareTo(java.math.BigDecimal.ZERO) < 0) discountPct = java.math.BigDecimal.ZERO;
          if (discountPct.compareTo(new java.math.BigDecimal("100")) > 0) discountPct = new java.math.BigDecimal("100");

          java.math.BigDecimal lineBase = rate.multiply(qty);
          java.math.BigDecimal discountAmount = lineBase.multiply(discountPct.divide(new java.math.BigDecimal("100"), 4, java.math.RoundingMode.HALF_UP));
          java.math.BigDecimal netAmount = lineBase.subtract(discountAmount);

          grossTotal = grossTotal.add(lineBase);
          discountSavings = discountSavings.add(discountAmount);
          subtotal = subtotal.add(netAmount);

          itemsTable.addCell(bodyCell(desc, valueFont, com.lowagie.text.Element.ALIGN_LEFT));
          itemsTable.addCell(bodyCell(hsn, valueFont, com.lowagie.text.Element.ALIGN_CENTER));
          itemsTable.addCell(bodyCell(formatQuantity(qty), valueFont, com.lowagie.text.Element.ALIGN_RIGHT));
          itemsTable.addCell(bodyCell(formatCurrency(rate), valueFont, com.lowagie.text.Element.ALIGN_RIGHT));
          itemsTable.addCell(bodyCell(formatPercent(discountPct), valueFont, com.lowagie.text.Element.ALIGN_RIGHT));
          itemsTable.addCell(bodyCell(formatCurrency(netAmount), valueFont, com.lowagie.text.Element.ALIGN_RIGHT));
        }
      } else {
        PdfPCell empty = bodyCell("No service items captured", valueFont, com.lowagie.text.Element.ALIGN_LEFT);
        empty.setColspan(6);
        itemsTable.addCell(empty);
      }
      itemsTable.setSpacingAfter(12f);
      doc.add(itemsTable);
      java.math.BigDecimal transport = parseDecimal(totals != null ? totals.get("transport") : null);
      java.math.BigDecimal cgst = parseDecimal(totals != null ? totals.get("cgst") : null);
      java.math.BigDecimal sgst = parseDecimal(totals != null ? totals.get("sgst") : null);
      java.math.BigDecimal igst = parseDecimal(totals != null ? totals.get("igst") : null);
      java.math.BigDecimal recordedGrand = parseDecimal(totals != null ? totals.get("grand") : null);

      java.math.BigDecimal totalBeforeTax = subtotal.add(transport);
      java.math.BigDecimal grand = recordedGrand.compareTo(java.math.BigDecimal.ZERO) > 0
          ? recordedGrand
          : totalBeforeTax.add(cgst).add(sgst).add(igst);

      PdfPTable totalsTable = new PdfPTable(new float[]{1.7f, 1f});
      totalsTable.setWidthPercentage(45);
      totalsTable.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
      totalsTable.setSpacingAfter(10f);

      totalsTable.addCell(summaryLabel("Gross Amount", labelFont));
      totalsTable.addCell(summaryValue(formatCurrency(grossTotal), valueFont));
      if (discountSavings.compareTo(java.math.BigDecimal.ZERO) > 0) {
        totalsTable.addCell(summaryLabel("Discount Savings", labelFont));
        totalsTable.addCell(summaryValue("-" + formatCurrency(discountSavings), valueFont));
      }
      if (transport.compareTo(java.math.BigDecimal.ZERO) > 0) {
        totalsTable.addCell(summaryLabel("Transport", labelFont));
        totalsTable.addCell(summaryValue(formatCurrency(transport), valueFont));
      }
      totalsTable.addCell(summaryLabel("Net Subtotal", labelFont));
      totalsTable.addCell(summaryValue(formatCurrency(totalBeforeTax), valueFont));
      if (cgst.compareTo(java.math.BigDecimal.ZERO) > 0) {
        totalsTable.addCell(summaryLabel("CGST", labelFont));
        totalsTable.addCell(summaryValue(formatCurrency(cgst), valueFont));
      }
      if (sgst.compareTo(java.math.BigDecimal.ZERO) > 0) {
        totalsTable.addCell(summaryLabel("SGST", labelFont));
        totalsTable.addCell(summaryValue(formatCurrency(sgst), valueFont));
      }
      if (igst.compareTo(java.math.BigDecimal.ZERO) > 0) {
        totalsTable.addCell(summaryLabel("IGST", labelFont));
        totalsTable.addCell(summaryValue(formatCurrency(igst), valueFont));
      }
      totalsTable.addCell(summaryLabel("Grand Total", labelFont));
      totalsTable.addCell(summaryValue(formatCurrency(grand), valueFont));
      doc.add(totalsTable);

      String amountWords;
      if (totals != null && totals.get("inWords") != null) {
        amountWords = String.valueOf(totals.get("inWords"));
      } else {
        amountWords = com.vebops.util.Words.inIndianSystem(grand) + " Only";
      }

      Paragraph wordsHeading = new Paragraph("Amount in words", sectionFont);
      wordsHeading.setSpacingAfter(2f);
      doc.add(wordsHeading);
      doc.add(new Paragraph(amountWords, valueFont));

      Paragraph note = new Paragraph(
          "Cabling and wiring installation completed as per site schedule. Please arrange payment within the agreed credit period.",
          noteFont);
      note.setSpacingBefore(12f);
      note.setSpacingAfter(18f);
      doc.add(note);

      PdfPTable signature = new PdfPTable(new float[]{1f, 1f});
      signature.setWidthPercentage(100);
      signature.getDefaultCell().setBorder(Rectangle.NO_BORDER);

      Paragraph assurance = new Paragraph("Prepared by: Cable & Wiring Installation Team", valueFont);
      PdfPCell assuranceCell = new PdfPCell(assurance);
      assuranceCell.setBorder(Rectangle.NO_BORDER);
      signature.addCell(assuranceCell);

      String companyName = company != null && company.getName() != null ? company.getName() : "Cable & Wiring Installation Services";
      Paragraph signLine = new Paragraph("______________________________", valueFont);
      signLine.setAlignment(Element.ALIGN_RIGHT);
      Paragraph signBlock = new Paragraph("Authorised Signatory\nfor " + companyName, labelFont);
      signBlock.setAlignment(Element.ALIGN_RIGHT);
      PdfPCell signCell = new PdfPCell();
      signCell.setBorder(Rectangle.NO_BORDER);
      signCell.addElement(signLine);
      signCell.addElement(signBlock);
      signature.addCell(signCell);
      doc.add(signature);

      doc.close();
      return bout.toByteArray();
    } catch (Exception ex) {
      throw new RuntimeException("Failed to build service invoice PDF", ex);
    }
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
      Document doc = new Document(PageSize.A4, 36, 36, 48, 36);
      PdfWriter.getInstance(doc, bout);
      doc.open();

      Font titleFont = fontBold(16f);
      Font sectionFont = fontBold(11f);
      Font labelFont = fontBold(9f);
      Font valueFont = fontRegular(9f);
      Font noteFont = fontRegular(8f);

      Paragraph heading = new Paragraph("WORK COMPLETION CERTIFICATE", titleFont);
      heading.setAlignment(Element.ALIGN_CENTER);
      heading.setSpacingAfter(6f);
      doc.add(heading);

      Paragraph generated = new Paragraph("Generated on: " + formatDateTime(LocalDateTime.now()), valueFont);
      generated.setAlignment(Element.ALIGN_CENTER);
      generated.setSpacingAfter(16f);
      doc.add(generated);

      ServiceRequest sr = wo != null ? wo.getServiceRequest() : null;

      PdfPTable summary = new PdfPTable(new float[]{1.1f, 1.6f});
      summary.setWidthPercentage(100);
      summary.setSpacingAfter(12f);
      addDetailRow(summary, "Work Order", wo != null ? wo.getWan() : "", labelFont, valueFont);
      addDetailRow(summary, "Status", wo != null && wo.getStatus() != null ? wo.getStatus().name().replace('_', ' ') : "", labelFont, valueFont);
      addDetailRow(summary, "Service Request", sr != null ? sr.getSrn() : "", labelFont, valueFont);
      addDetailRow(summary, "Service Type", sr != null && sr.getServiceType() != null ? sr.getServiceType().name().replace('_', ' ') : "", labelFont, valueFont);
      addDetailRow(summary, "Assigned Engineer", assignedEngineerName(wo), labelFont, valueFont);
      addDetailRow(summary, "Customer", sr != null && sr.getCustomer() != null ? sr.getCustomer().getName() : "", labelFont, valueFont);
      addDetailRow(summary, "Customer PO", wo != null && wo.getCustomerPO() != null ? wo.getCustomerPO().getPoNumber() : "", labelFont, valueFont);
      addDetailRow(summary, "Site Address", resolveSiteAddress(wo, sr), labelFont, valueFont);
      doc.add(summary);

      if (sr != null && sr.getCustomer() != null) {
        Customer customer = sr.getCustomer();
        PdfPTable contact = new PdfPTable(new float[]{1.1f, 1.6f});
        contact.setWidthPercentage(100);
        contact.setSpacingAfter(16f);
        addDetailRow(contact, "Customer Email", customer.getEmail(), labelFont, valueFont);
        addDetailRow(contact, "Customer Phone", customer.getMobile(), labelFont, valueFont);
        doc.add(contact);
      }

      Paragraph progressHeading = new Paragraph("Progress Timeline", sectionFont);
      progressHeading.setSpacingAfter(6f);
      doc.add(progressHeading);

      PdfPTable progressTable = new PdfPTable(new float[]{0.6f, 1.3f, 2.4f, 1.3f, 1.4f});
      progressTable.setWidthPercentage(100);
      addTableHeader(progressTable, labelFont, "#", "Status", "Remarks", "Updated By", "Timestamp");

      List<WorkOrderProgress> entries = progress != null ? progress : Collections.emptyList();
      int idx = 1;
      for (WorkOrderProgress entry : entries) {
        progressTable.addCell(bodyCell(String.valueOf(idx++), valueFont, Element.ALIGN_CENTER));
        progressTable.addCell(bodyCell(entry.getStatus() != null ? entry.getStatus().name().replace('_', ' ') : "", valueFont, Element.ALIGN_LEFT));
        progressTable.addCell(bodyCell(entry.getRemarks(), valueFont, Element.ALIGN_LEFT));
        String updatedBy = "";
        if (entry.getByFE() != null) {
          updatedBy = safe(entry.getByFE().getUser() != null ? entry.getByFE().getUser().getDisplayName() : entry.getByFE().getName());
        }
        progressTable.addCell(bodyCell(updatedBy, valueFont, Element.ALIGN_LEFT));
        progressTable.addCell(bodyCell(formatDateTime(entry.getCreatedAt()), valueFont, Element.ALIGN_RIGHT));
      }
      if (entries.isEmpty()) {
        PdfPCell empty = bodyCell("No progress updates were recorded for this work order.", valueFont, Element.ALIGN_LEFT);
        empty.setColspan(5);
        progressTable.addCell(empty);
      }
      progressTable.setSpacingAfter(14f);
      doc.add(progressTable);

      Paragraph photosHeading = new Paragraph("Photo Evidence", sectionFont);
      photosHeading.setSpacingAfter(6f);
      doc.add(photosHeading);

      List<WorkOrderProgressAttachment> attachments = new ArrayList<>();
      for (WorkOrderProgress entry : entries) {
        if (entry.getAttachments() != null) {
          attachments.addAll(entry.getAttachments());
        }
      }

      if (attachments.isEmpty()) {
        Paragraph noPhotos = new Paragraph("No photo evidence was uploaded for this work order.", valueFont);
        noPhotos.setSpacingAfter(12f);
        doc.add(noPhotos);
      } else {
        PdfPTable photoTable = new PdfPTable(new float[]{0.6f, 2.6f, 1.2f, 1.4f});
        photoTable.setWidthPercentage(100);
        addTableHeader(photoTable, labelFont, "#", "File Name", "Type", "Uploaded At");
        int photoIndex = 1;
        for (WorkOrderProgressAttachment att : attachments) {
          photoTable.addCell(bodyCell(String.valueOf(photoIndex++), valueFont, Element.ALIGN_CENTER));
          photoTable.addCell(bodyCell(att.getFilename(), valueFont, Element.ALIGN_LEFT));
          photoTable.addCell(bodyCell(att.getContentType(), valueFont, Element.ALIGN_LEFT));
          photoTable.addCell(bodyCell(formatDateTime(att.getUploadedAt()), valueFont, Element.ALIGN_RIGHT));
        }
        photoTable.setSpacingAfter(14f);
        doc.add(photoTable);
      }

      Paragraph summaryHeading = new Paragraph("Completion Summary", sectionFont);
      summaryHeading.setSpacingAfter(4f);
      doc.add(summaryHeading);

      Paragraph summaryNote = new Paragraph(
          "Installation, testing and commissioning activities for the above work order have been completed as per the recorded progress updates and approvals.",
          valueFont);
      summaryNote.setSpacingAfter(14f);
      doc.add(summaryNote);

      Paragraph reminder = new Paragraph(
          "Please retain this certificate for your records. For any clarifications contact the project coordination team.",
          noteFont);
      reminder.setSpacingAfter(18f);
      doc.add(reminder);

      PdfPTable signature = new PdfPTable(new float[]{1f, 1f});
      signature.setWidthPercentage(100);
      signature.getDefaultCell().setBorder(Rectangle.NO_BORDER);

      PdfPCell left = new PdfPCell();
      left.setBorder(Rectangle.NO_BORDER);
      Paragraph leftText = new Paragraph("Certified by", labelFont);
      leftText.setSpacingAfter(2f);
      left.addElement(leftText);
      left.addElement(new Paragraph("Cable & Wiring Installation Team", valueFont));
      signature.addCell(left);

      PdfPCell right = new PdfPCell();
      right.setBorder(Rectangle.NO_BORDER);
      right.setHorizontalAlignment(Element.ALIGN_RIGHT);
      Paragraph line = new Paragraph("______________________________", valueFont);
      line.setAlignment(Element.ALIGN_RIGHT);
      Paragraph sig = new Paragraph("Authorised Signatory", labelFont);
      sig.setAlignment(Element.ALIGN_RIGHT);
      right.addElement(line);
      right.addElement(sig);
      signature.addCell(right);
      doc.add(signature);

      doc.close();
      return bout.toByteArray();
    } catch (Exception e) {
      throw new RuntimeException("Failed to build completion report PDF", e);
    }
  }

  // inside PdfUtil class
public static byte[] buildProposalPdf(
    com.vebops.domain.Proposal p,
    java.util.List<com.vebops.domain.ProposalItem> items,
    com.vebops.dto.ProposalPdfRequest cfg,
    com.vebops.domain.Customer customer
) {
  try {
    var bout = new java.io.ByteArrayOutputStream();
    var doc = new com.lowagie.text.Document(PageSize.A4, 36, 36, 36, 36);
    com.lowagie.text.pdf.PdfWriter.getInstance(doc, bout);
    doc.open();

    var h1 = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 14, com.lowagie.text.Font.BOLD);
    var h2 = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 11, com.lowagie.text.Font.BOLD);
    var body = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10, com.lowagie.text.Font.NORMAL);

    // Header: Seller (Tenant)
    var header = new com.lowagie.text.Paragraph(cfg.tenantName, h1);
    header.setAlignment(com.lowagie.text.Element.ALIGN_LEFT);
    doc.add(header);
    doc.add(new com.lowagie.text.Paragraph(
      safe(cfg.tenantAddressLine1) + (isBlank(cfg.tenantAddressLine2) ? "" : ", " + cfg.tenantAddressLine2),
      body));
    doc.add(new com.lowagie.text.Paragraph(
      "GSTIN: " + safe(cfg.tenantGstin) + "   State: " + safe(cfg.tenantStateName) + " (" + safe(cfg.tenantStateCode) + ")", body));
    if (!isBlank(cfg.tenantEmail) || !isBlank(cfg.tenantPhone)) {
      doc.add(new com.lowagie.text.Paragraph(
        (isBlank(cfg.tenantEmail) ? "" : "Email: " + cfg.tenantEmail) +
        (isBlank(cfg.tenantPhone) ? "" : (isBlank(cfg.tenantEmail) ? "" : "   ") + "Phone: " + cfg.tenantPhone), body));
    }
    doc.add(new com.lowagie.text.Paragraph(" ", body));

    // Quote meta
    var metaTbl = new com.lowagie.text.pdf.PdfPTable(2);
    metaTbl.setWidths(new float[]{1.6f, 1.4f});
    metaTbl.setWidthPercentage(100);
    metaTbl.addCell(cell("Quote #: P" + p.getId(), h2, com.lowagie.text.Element.ALIGN_LEFT));
    metaTbl.addCell(cell("Quote Date: " + java.time.LocalDate.now(), h2, com.lowagie.text.Element.ALIGN_RIGHT));
    metaTbl.addCell(cell("Place Of Supply: " + safe(cfg.placeOfSupply), body, com.lowagie.text.Element.ALIGN_LEFT));
    metaTbl.addCell(cell("Customer: " + (customer != null ? safe(customer.getName()) : ""), body, com.lowagie.text.Element.ALIGN_RIGHT));
    doc.add(metaTbl);
    doc.add(new com.lowagie.text.Paragraph(" ", body));

    // Bill To / Ship To
    var billShip = new com.lowagie.text.pdf.PdfPTable(2);
    billShip.setWidthPercentage(100);
    billShip.setWidths(new float[]{1,1});
    billShip.addCell(block("Bill To",
      makeAddress(customer), h2, body));
    billShip.addCell(block("Ship To",
      makeAddress(customer), h2, body));
    doc.add(billShip);
    doc.add(new com.lowagie.text.Paragraph(" ", body));

    // Items table — Item & Description | HSN/SAC | Qty | Rate | IGST/CGST/SGST | Amount
    var t = new com.lowagie.text.pdf.PdfPTable(6);
    t.setWidthPercentage(100);
    t.setWidths(new float[]{2.5f, 1.2f, 0.8f, 1.0f, 1.0f, 1.2f});
    addHead(t, "Item & Description", "HSN/SAC", "Qty", "Rate", "Tax", "Amount");

    java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;
    java.math.BigDecimal taxTotal = java.math.BigDecimal.ZERO;

    for (var it : items) {
      var qty = nvl(it.getQty());
      var rate = nvl(it.getRate());
      var amount = qty.multiply(rate);
      subtotal = subtotal.add(amount);

      // pick the tax%: prefer line tax% if present, else cfg.taxPercent
      BigDecimal lineTaxPct = (it.getTaxRate() != null
        ? it.getTaxRate()
        : (cfg.taxPercent != null ? cfg.taxPercent : BigDecimal.ZERO));
      java.math.BigDecimal lineTaxAmt = amount.multiply(lineTaxPct).divide(java.math.BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
      taxTotal = taxTotal.add(lineTaxAmt);

      String taxLabel = taxSplitLabel(cfg, lineTaxPct); // "IGST 18%" or "CGST 9% + SGST 9%"
      t.addCell(txt(safe(it.getDescription())));
      t.addCell(txt(safe(it.getHsn())));
      t.addCell(txt(qty.stripTrailingZeros().toPlainString()));
      t.addCell(txt(money(rate)));
      t.addCell(txt(taxLabel));
      t.addCell(txt(money(amount)));
    }
    doc.add(t);

    // Totals
    doc.add(space());
    doc.add(new com.lowagie.text.Paragraph("Sub Total: " + money(subtotal), h2));
    doc.add(new com.lowagie.text.Paragraph("Tax: " + money(taxTotal), h2));
    doc.add(new com.lowagie.text.Paragraph("Total: " + money(subtotal.add(taxTotal)), h2)
      {{ setAlignment(com.lowagie.text.Element.ALIGN_RIGHT); }});

    // Total in words
    doc.add(space());
    doc.add(new com.lowagie.text.Paragraph("Total In Words", h2));
    doc.add(new com.lowagie.text.Paragraph(
      "Indian Rupee " + com.vebops.util.Words.inIndianSystem(subtotal.add(taxTotal)) + " Only", body));
    
    // Notes & Terms
    if (!isBlank(cfg.notes)) { doc.add(space()); doc.add(new com.lowagie.text.Paragraph("Notes", h2)); doc.add(new com.lowagie.text.Paragraph(cfg.notes, body)); }
    if (!isBlank(cfg.terms)) { doc.add(space()); doc.add(new com.lowagie.text.Paragraph("Terms & Conditions", h2)); doc.add(new com.lowagie.text.Paragraph(cfg.terms, body)); }
    if (cfg.quoteValidityDays != null) {
      doc.add(space());
      doc.add(new com.lowagie.text.Paragraph("Quote Validity: " + cfg.quoteValidityDays + " day(s).", body));
    }
    if (!isBlank(cfg.bankName) || !isBlank(cfg.bankAccountNo)) {
      doc.add(space());
      doc.add(new com.lowagie.text.Paragraph("Bank Details", h2));
      doc.add(new com.lowagie.text.Paragraph(
        (isBlank(cfg.bankName) ? "" : ("Bank: " + cfg.bankName + "\n")) +
        (isBlank(cfg.bankAccountName) ? "" : ("A/c Name: " + cfg.bankAccountName + "\n")) +
        (isBlank(cfg.bankAccountNo) ? "" : ("A/c No: " + cfg.bankAccountNo + "\n")) +
        (isBlank(cfg.bankIfsc) ? "" : ("IFSC: " + cfg.bankIfsc + "\n")),
        body));
    }

    doc.close();
    return bout.toByteArray();
  } catch (Exception e) {
    throw new RuntimeException("Failed to build proposal PDF", e);
  }
}

// --- small helpers (add into PdfUtil) ---
private static boolean isBlank(String s){ return s==null || s.isBlank(); }
private static java.math.BigDecimal nvl(java.math.BigDecimal v){ return v==null? java.math.BigDecimal.ZERO : v; }
private static com.lowagie.text.Paragraph space(){ return new com.lowagie.text.Paragraph(" "); }

private static com.lowagie.text.pdf.PdfPCell cell(String txt, com.lowagie.text.Font f, int align){
    var c = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(txt, f));
    c.setHorizontalAlignment(align); c.setPadding(6f); return c;
}
private static com.lowagie.text.pdf.PdfPCell txt(String s){
    var c = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(s, new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9)));
    c.setPadding(5f);
    return c;
}
private static void addHead(com.lowagie.text.pdf.PdfPTable t, String... cols){
    var f = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9, com.lowagie.text.Font.BOLD, java.awt.Color.WHITE);
    for (var h : cols){
        var c = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(h, f));
        c.setBackgroundColor(new java.awt.Color(52, 73, 94)); c.setPadding(6f);
        t.addCell(c);
    }
}
private static com.lowagie.text.pdf.PdfPCell block(String title, String body,
        com.lowagie.text.Font h2, com.lowagie.text.Font f){
    var ph = new com.lowagie.text.Paragraph(title, h2);
    var pb = new com.lowagie.text.Paragraph(body, f);
    var inner = new com.lowagie.text.Paragraph(); inner.add(ph); inner.add(pb);
    var c = new com.lowagie.text.pdf.PdfPCell(); c.addElement(inner); c.setPadding(6f); return c;
}
private static String makeAddress(com.vebops.domain.Customer c){
    if (c==null) return "";
    var addr = safe(c.getAddress());
    var name = safe(c.getName());
    return name + (addr.isBlank()? "" : "\n" + addr);
}
private static String money(java.math.BigDecimal v){
    var x = v==null? java.math.BigDecimal.ZERO : v.setScale(2, java.math.RoundingMode.HALF_UP);
    return "₹" + x.toPlainString();
}

    private static String cleanDocNumber(Object value) {
        if (value == null) return "";
        String code = String.valueOf(value).trim();
        if (code.isEmpty()) return "";
        while (code.startsWith("#")) {
            code = code.substring(1).trim();
        }
        return code;
    }

// If tenant state code differs from place of supply code -> IGST; else split evenly CGST/SGST
private static String taxSplitLabel(com.vebops.dto.ProposalPdfRequest cfg, java.math.BigDecimal pct){
    String tenantCode = safe(cfg.tenantStateCode).replaceAll("\\D","");
    String posCode = safe(cfg.placeOfSupply).replaceAll("\\D","");
    if (!tenantCode.isEmpty() && !posCode.isEmpty() && !tenantCode.equals(posCode)) {
        return "IGST " + pct.stripTrailingZeros().toPlainString() + "%";
    }
    // Intra-state
    var half = pct.divide(java.math.BigDecimal.valueOf(2), 2, java.math.RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    return "CGST " + half + "% + SGST " + half + "%";
}

    /**
     * Build a labelled cell for the meta table in the legacy service invoice
     * generator.  Each cell consists of the label in bold followed by the
     * corresponding value in a regular font on the next line.  If the value
     * is null or blank a dash (–) is displayed instead.  Borders are removed
     * to achieve a seamless grid appearance.
     *
     * @param label the field name to display (e.g. "Service Type")
     * @param value the value associated with the field
     * @param labelFont the font to use for the label
     * @param valueFont the font to use for the value
     * @return a PdfPCell containing the formatted content
     */
    private static com.lowagie.text.pdf.PdfPCell metaCell(String label, String value, com.lowagie.text.Font labelFont, com.lowagie.text.Font valueFont) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell();
        cell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        com.lowagie.text.Paragraph p = new com.lowagie.text.Paragraph();
        if (label != null) {
            p.add(new com.lowagie.text.Chunk(label + ": ", labelFont));
        }
        String val = (value == null || value.isBlank()) ? "—" : value;
        p.add(new com.lowagie.text.Chunk(val, valueFont));
        cell.addElement(p);
        return cell;
    }

    /**
     * Escape HTML special characters to prevent breaking the generated
     * invoice markup.  Replaces &, <, >, \" and ' with their corresponding
     * entities.  Null values are treated as empty strings.
     */
    private static String escapeHtml(String s) {
        if (s == null) return "";
        String out = s;
        out = out.replace("&", "&amp;");
        out = out.replace("<", "&lt;");
        out = out.replace(">", "&gt;");
        out = out.replace("\"", "&quot;");
        out = out.replace("'", "&#39;");
        return out;
    }

    private static final Pattern DESCRIPTION_SPLIT = Pattern.compile("\\r?\\n|[;|]|,(?!\\s*\\d)");

    private static String normalise(Object value) {
        if (value == null) return "";
        return value.toString().replaceAll("\\s+", " ").trim();
    }

    private static String firstNonEmptyString(Object... values) {
        if (values == null) return "";
        for (Object value : values) {
            String s = normalise(value);
            if (!s.isEmpty()) {
                return s;
            }
        }
        return "";
    }

    private static String cleanItemLabel(Object raw) {
        String label = normalise(raw);
        if (label.isEmpty()) return "";
        return normalise(label.replaceFirst("(?i)^installation\\s*[-–]\\s*", ""));
    }

    private static String inferItemKind(java.util.Map<String, Object> item, String baseLabel) {
        if (item == null) return "SUPPLY";
        for (Object candidate : new Object[]{ item.get("kind"), item.get("type"), item.get("lineKind") }) {
            String value = normalise(candidate).toUpperCase();
            if ("SUPPLY".equals(value) || "INSTALLATION".equals(value) || "TRANSPORT".equals(value)) {
                return value;
            }
        }
        String combinedName = (firstNonEmptyString(item.get("name"), item.get("itemName"), item.get("label"))
            + " " + normalise(baseLabel)).toLowerCase();
        if (combinedName.contains("transport") || combinedName.contains("freight")
            || combinedName.contains("delivery") || combinedName.contains("logistic")) {
            return "TRANSPORT";
        }
        if (combinedName.contains("installation") || combinedName.contains("erection")
            || combinedName.contains("commissioning")) {
            return "INSTALLATION";
        }
        return "SUPPLY";
    }

    private static String computeServiceChargeDescription(String serviceType, String label, String kind) {
        String name = cleanItemLabel(label);
        if (name.isEmpty()) return "";
        if ("TRANSPORT".equals(kind)) return "Transportation charges";
        if ("INSTALLATION".equals(kind)) return "Installation charges for " + name;
        String st = normalise(serviceType).toLowerCase();
        if (st.contains("installation only")) return "Installation charges for " + name;
        if (st.contains("supply with installation")) {
            if (name.toLowerCase().contains("installation")) {
                return "Installation charges for " + name;
            }
            return "Supply charges for " + name;
        }
        if (st.contains("supply")) return "Supply charges for " + name;
        return name;
    }

    private static java.util.List<String> splitDescriptionSegments(Object raw) {
        java.util.List<String> parts = new java.util.ArrayList<>();
        if (raw == null) return parts;
        String text = raw.toString();
        if (text == null || text.isBlank()) return parts;
        String[] tokens = DESCRIPTION_SPLIT.split(text);
        for (String token : tokens) {
            String cleaned = normalise(token);
            if (!cleaned.isEmpty()) parts.add(cleaned);
        }
        return parts;
    }

    private static void addLine(java.util.List<String> target, java.util.Set<String> seen, String value) {
        String cleaned = normalise(value);
        if (cleaned.isEmpty()) return;
        String key = cleaned.toLowerCase();
        if (seen.add(key)) {
            target.add(cleaned);
        }
    }

    private static java.util.List<String> buildServiceLineDescriptions(String serviceType, java.util.Map<String, Object> item) {
        java.util.List<String> lines = new java.util.ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        if (item == null) return lines;
        String label = firstNonEmptyString(item.get("name"), item.get("itemName"));
        String kind = inferItemKind(item, label);
        addLine(lines, seen, computeServiceChargeDescription(serviceType, label, kind));
        for (Object field : new Object[]{ item.get("description"), item.get("details"), item.get("itemDescription"), item.get("notes") }) {
            for (String part : splitDescriptionSegments(field)) {
                addLine(lines, seen, part);
            }
        }
        return lines;
    }

    /**
     * Mapping of Indian state names to their respective GST state codes. The keys are lower‑cased
     * state names (with whitespace normalized) and the values are two‑digit codes. This map
     * includes common states and union territories. It is used when deriving state codes
     * from a state name when no GSTIN is provided.
     */
    private static final java.util.Map<String, String> STATE_CODES = java.util.Map.ofEntries(
        java.util.Map.entry("andhra pradesh", "37"),
        java.util.Map.entry("arunachal pradesh", "12"),
        java.util.Map.entry("assam", "18"),
        java.util.Map.entry("bihar", "10"),
        java.util.Map.entry("chhattisgarh", "22"),
        java.util.Map.entry("goa", "30"),
        java.util.Map.entry("gujarat", "24"),
        java.util.Map.entry("haryana", "06"),
        java.util.Map.entry("himachal pradesh", "02"),
        java.util.Map.entry("jharkhand", "20"),
        java.util.Map.entry("karnataka", "29"),
        java.util.Map.entry("kerala", "32"),
        java.util.Map.entry("madhya pradesh", "23"),
        java.util.Map.entry("maharashtra", "27"),
        java.util.Map.entry("manipur", "14"),
        java.util.Map.entry("meghalaya", "17"),
        java.util.Map.entry("mizoram", "15"),
        java.util.Map.entry("nagaland", "13"),
        java.util.Map.entry("odisha", "21"),
        java.util.Map.entry("punjab", "03"),
        java.util.Map.entry("rajasthan", "08"),
        java.util.Map.entry("sikkim", "11"),
        java.util.Map.entry("tamil nadu", "33"),
        java.util.Map.entry("tamilnadu", "33"),
        java.util.Map.entry("telangana", "36"),
        java.util.Map.entry("tripura", "16"),
        java.util.Map.entry("uttar pradesh", "09"),
        java.util.Map.entry("uttarakhand", "05"),
        java.util.Map.entry("west bengal", "19"),
        java.util.Map.entry("delhi", "07"),
        java.util.Map.entry("jammu & kashmir", "01"),
        java.util.Map.entry("jammu and kashmir", "01"),
        java.util.Map.entry("ladakh", "38"),
        java.util.Map.entry("puducherry", "34"),
        java.util.Map.entry("chandigarh", "04"),
        java.util.Map.entry("andaman & nicobar", "35"),
        java.util.Map.entry("andaman and nicobar", "35"),
        java.util.Map.entry("dadra & nagar haveli & daman & diu", "26"),
        java.util.Map.entry("dadra and nagar haveli and daman and diu", "26"),
        java.util.Map.entry("lakshadweep", "31")
    );

    /**
     * Determine the GST state code from a GSTIN or a state name. GSTINs begin with two digits
     * representing the state code. If a valid two‑digit prefix exists on the GSTIN it is used.
     * Otherwise the state name is normalized (lower case, trimmed) and looked up in a map.
     * Returns an empty string when no code can be determined.
     *
     * @param gstin the GSTIN number, may be null or shorter than two characters
     * @param stateName the human‑readable state name, may be null or blank
     * @return a two‑digit GST state code or an empty string if not resolvable
     */
    private static String getStateCode(String gstin, String stateName) {
        if (gstin != null && gstin.length() >= 2) {
            String prefix = gstin.substring(0, 2);
            if (prefix.matches("\\d{2}")) {
                return prefix;
            }
        }
        if (stateName != null && !stateName.trim().isEmpty()) {
            String key = stateName.trim().toLowerCase();
            // Normalise ampersands and remove extra spaces
            key = key.replace("&", "and");
            key = key.replaceAll("\\s+", " ");
            String code = STATE_CODES.get(key);
            return code != null ? code : "";
        }
        return "";
    }

    /**
     * Build a PDF invoice for a service using an HTML template.  This method
     * mirrors the invoice preview page by constructing an HTML document with
     * inline CSS and dynamic content drawn from the Service entity, meta
     * information, item list, totals and company profile.  The HTML is then
     * converted to a PDF using OpenHTMLToPDF.  If conversion fails an empty
     * byte array is returned.  This method does not persist anything; the
     * caller is responsible for storing the resulting PDF.
     *
     * @param svc     the Service entity containing buyer/consignee fields
     * @param meta    the meta map containing invoice numbers, dates, etc.
     * @param items   list of item maps (each with basePrice, qty, discount, name, hsnSac)
     * @param totals  totals map (transport, cgst, sgst, igst, grand, inWords, etc.)
     * @param company tenant's company profile for seller details (nullable)
     * @return a PDF byte array encoded from the rendered HTML
     */
    public static byte[] buildServiceInvoicePdfHtml(
        com.vebops.domain.Service svc,
        java.util.Map<String, Object> meta,
        java.util.List<java.util.Map<String, Object>> items,
        java.util.Map<String, Object> totals,
        com.vebops.domain.CompanyDetails company
    ) {
        try {
            // Determine document type (invoice vs proforma)
            boolean isProforma = false;
            if (meta != null) {
                Object docTypeObj = meta.get("docType");
                if (docTypeObj != null && "PROFORMA".equalsIgnoreCase(docTypeObj.toString())) {
                    isProforma = true;
                }
                if (meta.get("pinvNo") != null || meta.get("pinvDate") != null) {
                    isProforma = true;
                }
            }
            String docTitle = isProforma ? "PROFORMA INVOICE" : "INVOICE";
            String docNoLabel = isProforma ? "PINV No." : "Invoice No.";
            String docDateLabel = isProforma ? "PINV Date" : "Date";
            String docNoValue = "";
            String docDateValue = "";
            if (meta != null) {
                if (isProforma) {
                    Object pinvNoObj = meta.get("pinvNo");
                    if (pinvNoObj != null) docNoValue = String.valueOf(pinvNoObj);
                    Object pinvDateObj = meta.get("pinvDate");
                    if (pinvDateObj != null) docDateValue = String.valueOf(pinvDateObj);
                } else {
                    Object invNoObj = meta.get("invoiceNo");
                    if (invNoObj != null) docNoValue = String.valueOf(invNoObj);
                    Object invDateObj = meta.get("invoiceDate");
                    if (invDateObj != null) docDateValue = String.valueOf(invDateObj);
                }
            }

            // Extract buyer and consignee fields
            String buyerName = safe(svc.getBuyerName()).toUpperCase();
            String buyerAddress = safe(svc.getBuyerAddress());
            String buyerPin = safe(svc.getBuyerPin());
            String buyerState = safe(svc.getBuyerState());
            String buyerGst = safe(svc.getBuyerGst());
            String buyerContact = safe(svc.getBuyerContact());
            String consigneeName = safe(svc.getConsigneeName()).toUpperCase();
            String consigneeAddress = safe(svc.getConsigneeAddress());
            String consigneePin = safe(svc.getConsigneePin());
            String consigneeState = safe(svc.getConsigneeState());
            String consigneeGst = safe(svc.getConsigneeGst());

            // Derive GST state codes for buyer and consignee.  The GSTIN prefix takes precedence
            // over the textual state name.  When a code cannot be determined an empty string
            // is returned so the display logic can omit the parentheses.
            String buyerStateCode = getStateCode(buyerGst, buyerState);
            String consigneeStateCode = getStateCode(consigneeGst, consigneeState);

            // Company information
            String companyName = "";
            String companyAddress = "";
            String companyGstinPan = "";
            String companyLogo = null;
            String companyBankName = "";
            String companyAccNo = "";
            String companyBranch = "";
            String companyIfsc = "";
            if (company != null) {
                if (company.getName() != null) companyName = company.getName();
                String a1 = safe(company.getAddressLine1());
                String a2 = safe(company.getAddressLine2());
                String addr = "";
                if (!a1.isBlank()) addr += a1;
                if (!a2.isBlank()) addr += (addr.isEmpty() ? "" : ", ") + a2;
                companyAddress = addr;
                String gst = safe(company.getGstin());
                String pan = safe(company.getPan());
                String gpan = "";
                if (!gst.isBlank()) gpan += "GSTIN: " + gst;
                if (!pan.isBlank()) gpan += (gpan.isEmpty() ? "" : "  ") + "PAN: " + pan;
                companyGstinPan = gpan;
                if (company.getLogoDataUrl() != null && !company.getLogoDataUrl().isBlank()) {
                    companyLogo = company.getLogoDataUrl();
                }
                companyBankName = safe(company.getBankName());
                companyAccNo = safe(company.getAccNo());
                companyBranch = safe(company.getBranch());
                companyIfsc = safe(company.getIfsc());
            }

            // Place of supply. Prefer value from meta, otherwise default to buyer, consignee or company state.
            String placeOfSupply = "";
            if (meta != null && meta.get("placeOfSupply") != null) {
                placeOfSupply = String.valueOf(meta.get("placeOfSupply"));
            }
            if (placeOfSupply == null || placeOfSupply.isBlank()) {
                if (!buyerState.isBlank()) placeOfSupply = buyerState;
                else if (!consigneeState.isBlank()) placeOfSupply = consigneeState;
                else if (company != null && company.getState() != null && !company.getState().isBlank()) placeOfSupply = company.getState();
                else placeOfSupply = "";
            }
            // Derive GST state code for place of supply from state name.  This uses only
            // the state name because the GSTIN prefix is unknown for the place of supply field.
            String placeOfSupplyCode = getStateCode(null, placeOfSupply);

            // Meta fields
            String serviceType = meta != null && meta.get("serviceType") != null ? String.valueOf(meta.get("serviceType")) : "";
            String buyerOrderNo = meta != null && meta.get("buyerOrderNo") != null ? String.valueOf(meta.get("buyerOrderNo")) : "";
            String orderDate = meta != null && meta.get("orderDate") != null ? String.valueOf(meta.get("orderDate")) : "";
            String dcNo = meta != null && meta.get("dcNo") != null ? String.valueOf(meta.get("dcNo")) : (meta != null && meta.get("deliveryChallanNo") != null ? String.valueOf(meta.get("deliveryChallanNo")) : "");
            String wcNo = meta != null && meta.get("wcNo") != null ? String.valueOf(meta.get("wcNo")) : (meta != null && meta.get("workCompletionCertNo") != null ? String.valueOf(meta.get("workCompletionCertNo")) : "");

            // Build item rows and compute totals
            java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;
            StringBuilder itemsRows = new StringBuilder();
            int lineNumber = 0;
            if (items != null) {
                for (java.util.Map<String, Object> it : items) {
                    if (it == null) continue;
                    lineNumber++;
                    String itemName = firstNonEmptyString(it.get("name"), it.get("itemName"));
                    if (itemName.isBlank()) itemName = "—";
                    String itemCode = firstNonEmptyString(it.get("code"), it.get("itemCode"));
                    String hsn = firstNonEmptyString(it.get("hsnSac"), it.get("hsn"), it.get("sac"));
                    java.math.BigDecimal rate = java.math.BigDecimal.ZERO;
                    java.math.BigDecimal qty = java.math.BigDecimal.ONE;
                    java.math.BigDecimal disc = java.math.BigDecimal.ZERO;
                    try { if (it.get("basePrice") != null) rate = new java.math.BigDecimal(it.get("basePrice").toString()); } catch (Exception ignored) {}
                    try { if (it.get("qty") != null) qty = new java.math.BigDecimal(it.get("qty").toString()); } catch (Exception ignored) {}
                    try { if (it.get("discount") != null) disc = new java.math.BigDecimal(it.get("discount").toString()); } catch (Exception ignored) {}
                    if (qty.compareTo(java.math.BigDecimal.ZERO) < 0) qty = java.math.BigDecimal.ZERO;
                    if (rate.compareTo(java.math.BigDecimal.ZERO) < 0) rate = java.math.BigDecimal.ZERO;
                    if (disc.compareTo(java.math.BigDecimal.ZERO) < 0) disc = java.math.BigDecimal.ZERO;
                    if (disc.compareTo(new java.math.BigDecimal("100")) > 0) disc = new java.math.BigDecimal("100");
                    java.math.BigDecimal line = rate.multiply(qty);
                    java.math.BigDecimal discounted = line.multiply(java.math.BigDecimal.ONE.subtract(disc.divide(new java.math.BigDecimal("100"), java.math.MathContext.DECIMAL128)));
                    subtotal = subtotal.add(discounted);
                    java.util.List<String> detailLines = buildServiceLineDescriptions(serviceType, it);
                    itemsRows.append("<tr>");
                    itemsRows.append("<td class='text-center serial-col'>" + lineNumber + "</td>");
                    itemsRows.append("<td>");
                    itemsRows.append("<div class='item-name'>" + escapeHtml(itemName) + "</div>");
                    if (!itemCode.isBlank()) {
                        itemsRows.append("<div class='item-code'>Code: " + escapeHtml(itemCode) + "</div>");
                    }
                    for (String descLine : detailLines) {
                        itemsRows.append("<div class='item-sub'>" + escapeHtml(descLine) + "</div>");
                    }
                    itemsRows.append("</td>");
                    itemsRows.append("<td class='text-center'>" + escapeHtml(hsn) + "</td>");
                    itemsRows.append("<td class='text-center'>" + qty.stripTrailingZeros().toPlainString() + "</td>");
                    itemsRows.append("<td class='text-right'>" + money(rate) + "</td>");
                    itemsRows.append("<td class='text-right'>" + money(discounted) + "</td>");
                    itemsRows.append("</tr>");
                }
            }
            if (itemsRows.length() == 0) {
                itemsRows.append("<tr class='empty'><td colspan='6'>No line items recorded</td></tr>");
            }
            // Transport and taxes
            java.math.BigDecimal transport = java.math.BigDecimal.ZERO;
            java.math.BigDecimal cgst = java.math.BigDecimal.ZERO;
            java.math.BigDecimal sgst = java.math.BigDecimal.ZERO;
            java.math.BigDecimal igst = java.math.BigDecimal.ZERO;
            if (totals != null) {
                try { if (totals.get("transport") != null) transport = new java.math.BigDecimal(totals.get("transport").toString()); } catch (Exception ignored) {}
                try { if (totals.get("cgst") != null) cgst = new java.math.BigDecimal(totals.get("cgst").toString()); } catch (Exception ignored) {}
                try { if (totals.get("sgst") != null) sgst = new java.math.BigDecimal(totals.get("sgst").toString()); } catch (Exception ignored) {}
                try { if (totals.get("igst") != null) igst = new java.math.BigDecimal(totals.get("igst").toString()); } catch (Exception ignored) {}
            }
            if (transport.compareTo(java.math.BigDecimal.ZERO) < 0) transport = java.math.BigDecimal.ZERO;
            if (cgst.compareTo(java.math.BigDecimal.ZERO) < 0) cgst = java.math.BigDecimal.ZERO;
            if (sgst.compareTo(java.math.BigDecimal.ZERO) < 0) sgst = java.math.BigDecimal.ZERO;
            if (igst.compareTo(java.math.BigDecimal.ZERO) < 0) igst = java.math.BigDecimal.ZERO;
            java.math.BigDecimal grand = subtotal.add(transport).add(cgst).add(sgst).add(igst);
            if (totals != null && totals.get("grand") != null) {
                try { grand = new java.math.BigDecimal(totals.get("grand").toString()); } catch (Exception ignored) {}
            }
            String subtotalStr = money(subtotal);
            String transportStr = money(transport);
            String cgstStr = money(cgst);
            String sgstStr = money(sgst);
            String igstStr = money(igst);
            String grandStr = money(grand);
            String amountInWords;
            if (totals != null && totals.get("inWords") != null) {
                amountInWords = String.valueOf(totals.get("inWords"));
            } else {
                amountInWords = com.vebops.util.Words.inIndianSystem(grand);
            }

            // Terms list
            java.util.List<String> termsList = new java.util.ArrayList<>();
            if (meta != null) {
                Object listObj = meta.get("termsList");
                if (listObj instanceof java.util.List<?> l) {
                    for (Object o : l) {
                        if (o != null) {
                            String s = o.toString().trim();
                            if (!s.isEmpty()) termsList.add(escapeHtml(s));
                        }
                    }
                }
                if (termsList.isEmpty() && meta.get("terms") != null) {
                    String s = meta.get("terms").toString();
                    String[] parts = s.split("\r?\n|[;|]");
                    for (String part : parts) {
                        String t = part.trim();
                        if (!t.isEmpty()) termsList.add(escapeHtml(t));
                    }
                }
            }
            String narration = meta != null && meta.get("narration") != null ? escapeHtml(String.valueOf(meta.get("narration"))) : "";

            String posDisplay;
            if (placeOfSupply == null || placeOfSupply.isBlank()) {
                posDisplay = "—";
            } else {
                posDisplay = escapeHtml(placeOfSupply);
                if (placeOfSupplyCode != null && !placeOfSupplyCode.isBlank()) {
                    posDisplay += " (" + placeOfSupplyCode + ")";
                }
            }

            // Compose HTML
            StringBuilder html = new StringBuilder();
            html.append("<html><head><meta charset='UTF-8' />");
            html.append("<style>");
            html.append("body{margin:0;padding:32px;background:#eef2ff;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;}");
            html.append(".invoice-wrapper{max-width:920px;margin:0 auto;}");
            html.append(".invoice-card{background:#ffffff;border-radius:28px;box-shadow:0 28px 80px rgba(15,23,42,0.12);overflow:hidden;}");
            html.append(".header{display:flex;justify-content:space-between;gap:24px;padding:36px;background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;}");
            html.append(".header-left{display:flex;gap:20px;align-items:center;}");
            html.append(".logo{width:80px;height:80px;border-radius:20px;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;overflow:hidden;}");
            html.append(".logo img{max-width:100%;max-height:100%;object-fit:contain;}");
            html.append(".logo span{font-size:12px;opacity:0.75;}");
            html.append(".company-title{margin:0;font-size:24px;font-weight:700;letter-spacing:0.4px;}");
            html.append(".company-meta{margin-top:8px;font-size:12px;line-height:1.6;opacity:0.9;}");
            html.append(".doc-meta{text-align:right;}");
            html.append(".doc-title{margin:0;font-size:28px;font-weight:700;letter-spacing:1px;}");
            html.append(".meta-line{display:block;margin-top:10px;font-size:12px;text-transform:uppercase;letter-spacing:1px;}");
            html.append(".section{padding:28px 36px;border-bottom:1px solid #e2e8f0;}");
            html.append(".section:last-child{border-bottom:none;}");
            html.append(".flex-wrap{display:flex;flex-wrap:wrap;gap:24px;}");
            html.append(".info-card{flex:1 1 280px;background:#f8fafc;border-radius:20px;padding:22px;}");
            html.append(".info-title{margin:0 0 12px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;}");
            html.append(".info-value{font-size:14px;font-weight:600;color:#0f172a;line-height:1.6;}");
            html.append(".info-value div+div{margin-top:4px;}");
            html.append(".meta-grid{display:flex;flex-wrap:wrap;gap:18px;}");
            html.append(".meta-item{flex:1 1 240px;min-width:180px;}");
            html.append(".meta-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:6px;}");
            html.append(".meta-value{font-size:13px;font-weight:500;color:#0f172a;}");
            html.append("table.items{width:100%;border-collapse:collapse;}");
            html.append("table.items thead th{background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;padding:12px;border-bottom:1px solid #dbeafe;text-align:left;}");
            html.append("table.items thead th.serial-col{text-align:center;width:48px;}");
            html.append("table.items thead th.text-center{text-align:center;}");
            html.append("table.items thead th.text-right{text-align:right;}");
            html.append("table.items tbody td{padding:12px;font-size:12px;color:#0f172a;border-bottom:1px solid #e2e8f0;}");
            html.append("table.items tbody tr:nth-child(even){background:#f8fafc;}");
            html.append("table.items tbody td.text-right{text-align:right;}");
            html.append("table.items tbody td.text-center{text-align:center;}");
            html.append("table.items tbody tr.empty td{text-align:center;color:#64748b;font-style:italic;}");
            html.append(".item-name{font-weight:600;}");
            html.append("table.items tbody td.serial-col{text-align:center;font-weight:600;color:#1e293b;}");
            html.append(".item-code{margin-top:4px;font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;}");
            html.append(".item-sub{margin-top:4px;font-size:11px;color:#64748b;}");
            html.append(".totals-wrap{display:flex;justify-content:flex-end;}");
            html.append(".totals-card{width:320px;background:linear-gradient(140deg,#0f172a,#1e293b);color:#fff;border-radius:24px;padding:26px;box-shadow:0 22px 55px rgba(15,23,42,0.38);}");
            html.append(".totals-card table{width:100%;border-collapse:collapse;}");
            html.append(".totals-card td{padding:6px 0;font-size:12px;color:rgba(255,255,255,0.85);}");
            html.append(".totals-card td.label{text-transform:uppercase;letter-spacing:0.8px;}");
            html.append(".totals-card td.value{text-align:right;font-weight:600;}");
            html.append(".totals-card tr.grand td{padding-top:14px;font-size:16px;font-weight:700;color:#fff;}");
            html.append(".totals-card tr.words td{padding-top:14px;font-size:11px;line-height:1.6;color:rgba(255,255,255,0.8);text-transform:none;letter-spacing:0;}");
            html.append(".footer-wrap{display:flex;flex-wrap:wrap;gap:24px;}");
            html.append(".footer-card{flex:1 1 280px;background:#f8fafc;border-radius:20px;padding:22px;}");
            html.append(".footer-card ul{margin:8px 0 0 20px;padding:0;}");
            html.append(".footer-card li{font-size:12px;color:#0f172a;line-height:1.6;margin-bottom:6px;}");
            html.append(".footer-card p{font-size:12px;color:#0f172a;line-height:1.6;margin:4px 0;}");
            html.append("</style></head><body>");
            html.append("<div class='invoice-wrapper'><div class='invoice-card'>");
            html.append("<div class='header'>");
            html.append("<div class='header-left'>");
            html.append("<div class='logo'>");
            if (companyLogo != null) {
                html.append("<img src='" + companyLogo + "' alt='Logo' />");
            } else {
                html.append("<span>Logo</span>");
            }
            html.append("</div>");
            html.append("<div>");
            html.append("<h1 class='company-title'>" + escapeHtml(companyName.isEmpty() ? "—" : companyName) + "</h1>");
            StringBuilder sellerMeta = new StringBuilder();
            if (!companyAddress.isBlank()) sellerMeta.append(escapeHtml(companyAddress));
            if (!companyGstinPan.isBlank()) {
                if (sellerMeta.length() > 0) sellerMeta.append("<br/>");
                sellerMeta.append(escapeHtml(companyGstinPan));
            }
            if (sellerMeta.length() == 0) sellerMeta.append("—");
            html.append("<div class='company-meta'>" + sellerMeta + "</div>");
            html.append("</div>");
            html.append("</div>");
            html.append("<div class='doc-meta'>");
            html.append("<h1 class='doc-title'>" + docTitle + "</h1>");
            html.append("<span class='meta-line'>" + docNoLabel + ": " + escapeHtml(docNoValue) + "</span>");
            html.append("<span class='meta-line'>" + docDateLabel + ": " + escapeHtml(docDateValue) + "</span>");
            html.append("</div>");
            html.append("</div>");
            html.append("<div class='section'>");
            html.append("<div class='flex-wrap'>");
            html.append("<div class='info-card'>");
            html.append("<div class='info-title'>Bill To</div>");
            html.append("<div class='info-value'>");
            html.append("<div>" + escapeHtml(buyerName.isEmpty() ? "—" : buyerName) + "</div>");
            if (!buyerAddress.isBlank()) html.append("<div>" + escapeHtml(buyerAddress) + "</div>");
            if (!buyerPin.isBlank()) html.append("<div>" + escapeHtml(buyerPin) + "</div>");
            if (!buyerState.isBlank()) {
                String line = escapeHtml(buyerState);
                if (!buyerStateCode.isBlank()) line += " (" + buyerStateCode + ")";
                html.append("<div>" + line + "</div>");
            }
            if (!buyerGst.isBlank()) html.append("<div>GSTIN: " + escapeHtml(buyerGst) + "</div>");
            if (!buyerContact.isBlank()) html.append("<div>Contact: " + escapeHtml(buyerContact) + "</div>");
            html.append("</div></div>");
            html.append("<div class='info-card'>");
            html.append("<div class='info-title'>Ship To</div>");
            html.append("<div class='info-value'>");
            html.append("<div>" + escapeHtml(consigneeName.isEmpty() ? "—" : consigneeName) + "</div>");
            if (!consigneeAddress.isBlank()) html.append("<div>" + escapeHtml(consigneeAddress) + "</div>");
            if (!consigneePin.isBlank()) html.append("<div>" + escapeHtml(consigneePin) + "</div>");
            if (!consigneeState.isBlank()) {
                String line = escapeHtml(consigneeState);
                if (!consigneeStateCode.isBlank()) line += " (" + consigneeStateCode + ")";
                html.append("<div>" + line + "</div>");
            }
            if (!consigneeGst.isBlank()) html.append("<div>GSTIN: " + escapeHtml(consigneeGst) + "</div>");
            html.append("</div></div>");
            html.append("</div>");
            html.append("</div>");
            html.append("<div class='section'>");
            html.append("<div class='meta-grid'>");
            html.append("<div class='meta-item'><div class='meta-label'>Service Type</div><div class='meta-value'>" + (serviceType.isBlank() ? "—" : escapeHtml(serviceType)) + "</div></div>");
            html.append("<div class='meta-item'><div class='meta-label'>Place of Supply</div><div class='meta-value'>" + posDisplay + "</div></div>");
            html.append("<div class='meta-item'><div class='meta-label'>Buyer’s Order / PO No.</div><div class='meta-value'>" + (buyerOrderNo.isBlank() ? "—" : escapeHtml(buyerOrderNo)) + "</div></div>");
            html.append("<div class='meta-item'><div class='meta-label'>PO / WO Date</div><div class='meta-value'>" + (orderDate.isBlank() ? "—" : escapeHtml(orderDate)) + "</div></div>");
            html.append("<div class='meta-item'><div class='meta-label'>Delivery Challan No.</div><div class='meta-value'>" + (dcNo.isBlank() ? "—" : escapeHtml(dcNo)) + "</div></div>");
            html.append("<div class='meta-item'><div class='meta-label'>Work Completion Cert No.</div><div class='meta-value'>" + (wcNo.isBlank() ? "—" : escapeHtml(wcNo)) + "</div></div>");
            html.append("</div>");
            html.append("</div>");
            html.append("<div class='section'>");
            html.append("<table class='items'>");
            html.append("<thead><tr>");
            html.append("<th class='serial-col'>S.No</th>");
            html.append("<th>Item Description</th>");
            html.append("<th class='text-center'>HSN/SAC</th>");
            html.append("<th class='text-center'>Qty</th>");
            html.append("<th class='text-right'>Rate</th>");
            html.append("<th class='text-right'>Amount</th>");
            html.append("</tr></thead><tbody>");
            html.append(itemsRows.toString());
            html.append("</tbody></table>");
            html.append("</div>");
            html.append("<div class='section'>");
            html.append("<div class='totals-wrap'><div class='totals-card'><table>");
            html.append("<tr><td class='label'>Subtotal</td><td class='value'>" + subtotalStr + "</td></tr>");
            if (transport.compareTo(java.math.BigDecimal.ZERO) > 0) {
                html.append("<tr><td class='label'>Transport</td><td class='value'>" + transportStr + "</td></tr>");
            }
            if (cgst.compareTo(java.math.BigDecimal.ZERO) > 0) {
                String rate = totals != null && totals.get("cgstRate") != null ? totals.get("cgstRate").toString() : "";
                html.append("<tr><td class='label'>CGST " + rate + "%</td><td class='value'>" + cgstStr + "</td></tr>");
            }
            if (sgst.compareTo(java.math.BigDecimal.ZERO) > 0) {
                String rate = totals != null && totals.get("sgstRate") != null ? totals.get("sgstRate").toString() : "";
                html.append("<tr><td class='label'>SGST " + rate + "%</td><td class='value'>" + sgstStr + "</td></tr>");
            }
            if (igst.compareTo(java.math.BigDecimal.ZERO) > 0) {
                String rate = totals != null && totals.get("igstRate") != null ? totals.get("igstRate").toString() : "";
                html.append("<tr><td class='label'>IGST " + rate + "%</td><td class='value'>" + igstStr + "</td></tr>");
            }
            html.append("<tr class='grand'><td class='label'>Grand Total</td><td class='value'>" + grandStr + "</td></tr>");
            html.append("<tr class='words'><td colspan='2'>Amount in words:<br/>" + escapeHtml(amountInWords) + "</td></tr>");
            html.append("</table></div></div>");
            html.append("</div>");
            html.append("<div class='section'>");
            html.append("<div class='footer-wrap'>");
            html.append("<div class='footer-card'>");
            html.append("<div class='info-title'>Company's Bank Details</div>");
            html.append("<div class='info-value'>");
            html.append("<div>Bank Name: " + (companyBankName.isBlank() ? "—" : escapeHtml(companyBankName)) + "</div>");
            html.append("<div>A/C No: " + (companyAccNo.isBlank() ? "—" : escapeHtml(companyAccNo)) + "</div>");
            html.append("<div>Branch: " + (companyBranch.isBlank() ? "—" : escapeHtml(companyBranch)) + "</div>");
            html.append("<div>IFSC: " + (companyIfsc.isBlank() ? "—" : escapeHtml(companyIfsc)) + "</div>");
            html.append("</div>");
            html.append("</div>");
            if (!termsList.isEmpty() || !narration.isBlank()) {
                html.append("<div class='footer-card'>");
                if (!termsList.isEmpty()) {
                    html.append("<div class='info-title'>Terms &amp; Conditions</div>");
                    html.append("<ul>");
                    for (String t : termsList) {
                        html.append("<li>" + t + "</li>");
                    }
                    html.append("</ul>");
                }
                if (!narration.isBlank()) {
                    html.append("<div class='info-title' style='margin-top:16px;'>Narration / Remarks</div>");
                    html.append("<p>" + narration + "</p>");
                }
                html.append("</div>");
            }
            html.append("</div>");
            html.append("</div>");
            html.append("</div></div></div>");
            html.append("</body></html>");

            // Render PDF using OpenHTMLToPDF
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.useFastMode();
            builder.withHtmlContent(html.toString(), null);
            builder.toStream(out);
            builder.run();
            return out.toByteArray();
        } catch (Exception e) {
            return new byte[0];
        }
    }


}
