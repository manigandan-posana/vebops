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
import java.text.DecimalFormat;
import java.text.NumberFormat;
import java.util.Locale;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.regex.Pattern;

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
          invoicemoney(l.getRate()),
          invoicemoney(l.getAmount()),
          safe(l.getSource()));
        subtotal = subtotal.add(l.getAmount());
      }
      doc.add(table);
      doc.add(Chunk.NEWLINE);

      Paragraph tot = new Paragraph("Total: " + invoicemoney(subtotal), h2);
      tot.setAlignment(Element.ALIGN_RIGHT);
      doc.add(tot);

      doc.close();
      return bout.toByteArray();
    } catch(Exception e){
      throw new RuntimeException("Failed to build invoice PDF", e);
    }
  }

  public static byte[] buildPurchaseOrderPdf(PurchaseOrder po, List<PurchaseOrderLine> lines) {
    try {
      ByteArrayOutputStream bout = new ByteArrayOutputStream();
      Document doc = new Document(PageSize.A4, 40, 40, 48, 40);
      PdfWriter.getInstance(doc, bout);
      doc.open();

      Color accent = new Color(36, 123, 160);
      Color subtle = new Color(240, 243, 245);
      Color border = new Color(222, 228, 232);
      Font title = new Font(Font.HELVETICA, 18, Font.BOLD, accent);
      Font label = new Font(Font.HELVETICA, 9, Font.BOLD, new Color(87, 96, 111));
      Font value = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(55, 65, 81));
      Font tiny = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(87, 96, 111));
      Font tableHead = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
      Font tableBody = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(55, 65, 81));

      java.time.format.DateTimeFormatter dateFmt = java.time.format.DateTimeFormatter.ofPattern("dd-MMM-yy");
      String orderDate = po.getOrderDate() != null ? po.getOrderDate().format(dateFmt) : "";

      PdfPTable header = new PdfPTable(new float[]{1f, 1f});
      header.setWidthPercentage(100);
      PdfPCell logo = new PdfPCell();
      logo.setMinimumHeight(48f);
      logo.setBorder(Rectangle.NO_BORDER);
      logo.setBackgroundColor(subtle);
      logo.setPadding(12f);
      Paragraph logoText = new Paragraph("Company Logo", value);
      logoText.setAlignment(Element.ALIGN_LEFT);
      logo.addElement(logoText);
      header.addCell(logo);

      PdfPCell headerRight = new PdfPCell();
      headerRight.setBorder(Rectangle.NO_BORDER);
      Paragraph titlePara = new Paragraph("PURCHASE ORDER", title);
      titlePara.setAlignment(Element.ALIGN_RIGHT);
      headerRight.addElement(titlePara);
      Paragraph voucherPara = new Paragraph("Voucher No.: " + safe(po.getVoucherNumber()), label);
      voucherPara.setAlignment(Element.ALIGN_RIGHT);
      headerRight.addElement(voucherPara);
      Paragraph datePara = new Paragraph("Date: " + orderDate, label);
      datePara.setAlignment(Element.ALIGN_RIGHT);
      headerRight.addElement(datePara);
      header.addCell(headerRight);

      doc.add(header);
      doc.add(Chunk.NEWLINE);

      PdfPTable parties = new PdfPTable(new float[]{1f, 1f});
      parties.setWidthPercentage(100);
      parties.addCell(partyCard("Invoice To", border, label, value,
          safe(po.getBuyerName()), safe(po.getBuyerAddress()), safe(po.getBuyerPhone()),
          safe(po.getBuyerGstin()), safe(po.getBuyerStateName()), safe(po.getBuyerStateCode()),
          safe(po.getBuyerEmail()), safe(po.getBuyerWebsite())));
      parties.addCell(supplierCard(border, label, value,
          safe(po.getSupplierName()), safe(po.getSupplierAddress()), safe(po.getSupplierGstin()),
          safe(po.getSupplierStateName()), safe(po.getSupplierStateCode())));
      doc.add(parties);
      doc.add(Chunk.NEWLINE);

      PdfPTable meta = new PdfPTable(new float[]{1f, 1f});
      meta.setWidthPercentage(100);
      meta.getDefaultCell().setBorder(Rectangle.NO_BORDER);
      meta.addCell(poMetaCell("Reference No. & Date", safe(po.getReferenceNumberAndDate()), label, value));
      meta.addCell(poMetaCell("Mode/Terms of Payment", safe(po.getPaymentTerms()), label, value));
      meta.addCell(poMetaCell("Dispatched Through", safe(po.getDispatchedThrough()), label, value));
      meta.addCell(poMetaCell("Destination", safe(po.getDestination()), label, value));
      meta.addCell(poMetaCell("Other References", safe(po.getOtherReferences()), label, value));
      meta.addCell(poMetaCell("Terms of Delivery", safe(po.getTermsOfDelivery()), label, value));
      doc.add(meta);
      doc.add(Chunk.NEWLINE);

      PdfPTable lineTable = new PdfPTable(new float[]{0.7f, 3.6f, 1f, 0.9f, 1.1f, 1.2f});
      lineTable.setWidthPercentage(100);
      addPoHeaderCell(lineTable, "Sl No.", tableHead, accent);
      addPoHeaderCell(lineTable, "Description of Goods", tableHead, accent);
      addPoHeaderCell(lineTable, "Quantity", tableHead, accent);
      addPoHeaderCell(lineTable, "Unit", tableHead, accent);
      addPoHeaderCell(lineTable, "Rate (₹ per unit)", tableHead, accent);
      addPoHeaderCell(lineTable, "Amount (₹)", tableHead, accent);

      int index = 1;
      if (lines != null) {
        for (PurchaseOrderLine line : lines) {
          lineTable.addCell(lineCell(String.valueOf(index++), tableBody, Element.ALIGN_CENTER));
          lineTable.addCell(lineCell(safe(line.getDescription()), tableBody, Element.ALIGN_LEFT));
          lineTable.addCell(lineCell(formatQuantity(line.getQuantity()), tableBody, Element.ALIGN_RIGHT));
          lineTable.addCell(lineCell(safe(line.getUnit()), tableBody, Element.ALIGN_CENTER));
          lineTable.addCell(lineCell(formatMoney(line.getRate()), tableBody, Element.ALIGN_RIGHT));
          lineTable.addCell(lineCell(formatMoney(line.getAmount()), tableBody, Element.ALIGN_RIGHT));
        }
      }
      if (index == 1) {
        PdfPCell empty = new PdfPCell(new Phrase("No items recorded", tableBody));
        empty.setColspan(6);
        empty.setHorizontalAlignment(Element.ALIGN_CENTER);
        empty.setPadding(10f);
        lineTable.addCell(empty);
      }
      doc.add(lineTable);
      doc.add(Chunk.NEWLINE);

      PdfPTable totals = new PdfPTable(new float[]{2f, 1.2f});
      totals.setWidthPercentage(50);
      totals.setHorizontalAlignment(Element.ALIGN_RIGHT);
      totals.getDefaultCell().setBorder(Rectangle.NO_BORDER);
      totals.addCell(totalsLabel("Subtotal", label));
      totals.addCell(totalsValue(formatMoney(po.getSubTotal()), value));
      totals.addCell(totalsLabel("CGST " + rateLabel(po.getCgstRate()) + "%", label));
      totals.addCell(totalsValue(formatMoney(po.getCgstAmount()), value));
      totals.addCell(totalsLabel("SGST " + rateLabel(po.getSgstRate()) + "%", label));
      totals.addCell(totalsValue(formatMoney(po.getSgstAmount()), value));
      PdfPCell grandLabel = totalsLabel("Grand Total (₹)", label);
      grandLabel.setBorder(Rectangle.TOP);
      grandLabel.setBorderColor(border);
      totals.addCell(grandLabel);
      PdfPCell grandValue = totalsValue(formatMoney(po.getGrandTotal()), value);
      grandValue.setBorder(Rectangle.TOP);
      grandValue.setBorderColor(border);
      totals.addCell(grandValue);
      doc.add(totals);

      doc.add(Chunk.NEWLINE);
      Paragraph amountWords = new Paragraph(
          "Amount Chargeable (in words): " + safe(po.getAmountInWords()), value);
      amountWords.setAlignment(Element.ALIGN_LEFT);
      doc.add(amountWords);
      doc.add(Chunk.NEWLINE);

      PdfPTable footer = new PdfPTable(new float[]{1f, 1f});
      footer.setWidthPercentage(100);
      footer.getDefaultCell().setBorder(Rectangle.NO_BORDER);

      Paragraph footLeft = new Paragraph();
      footLeft.add(new Phrase("Company’s PAN: " + safe(po.getCompanyPan()) + "\n", value));
      footLeft.add(new Phrase("E. & O.E\n", tiny));
      footLeft.add(new Phrase("This is a computer generated document.", tiny));
      PdfPCell footLeftCell = new PdfPCell(footLeft);
      footLeftCell.setBorder(Rectangle.NO_BORDER);
      footer.addCell(footLeftCell);

      Paragraph footRight = new Paragraph();
      footRight.add(new Phrase("for " + safe(po.getBuyerName()) + "\n\n", value));
      footRight.add(new Phrase("\n\n", value));
      footRight.add(new Phrase("Authorised Signatory", label));
      PdfPCell footRightCell = new PdfPCell(footRight);
      footRightCell.setBorder(Rectangle.NO_BORDER);
      footRightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
      footer.addCell(footRightCell);

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
    try {
      // Create the PDF document with sensible margins
      java.io.ByteArrayOutputStream bout = new java.io.ByteArrayOutputStream();
      com.lowagie.text.Document doc = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4, 36, 36, 36, 36);
      com.lowagie.text.pdf.PdfWriter.getInstance(doc, bout);
      doc.open();

      // -------------------------------------------------------------------------
      // Define fonts used throughout the invoice. Using consistent fonts makes
      // the output resemble the on‑screen preview. Adjust sizes to loosely
      // mirror the Tailwind classes in Preview.jsx (e.g. text-[22px] ≈ 16pt).
      var titleFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 18, com.lowagie.text.Font.BOLD);
      var companyFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12, com.lowagie.text.Font.BOLD);
      var boldFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9, com.lowagie.text.Font.BOLD);
      var regularFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9, com.lowagie.text.Font.NORMAL);
      var smallBold = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 8, com.lowagie.text.Font.BOLD);
      var small = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 8, com.lowagie.text.Font.NORMAL);

      // -------------------------------------------------------------------------
      // Determine doc type (Invoice vs Proforma) and derive labels/values. If a
      // proforma number/date is provided in meta then treat the document as a
      // proforma invoice; otherwise fall back to a standard invoice. This is
      // analogous to the docType logic in Preview.jsx.
      String declaredDocType = "";
      String invoiceNo = "";
      String invoiceDate = "";
      String pinvNo = "";
      String pinvDate = "";
      if (meta != null) {
        Object docTypeObj = meta.get("docType");
        if (docTypeObj != null) {
          declaredDocType = String.valueOf(docTypeObj).trim().toUpperCase();
        }
        invoiceNo = cleanDocNumber(meta.get("invoiceNo"));
        Object invDateObj = meta.get("invoiceDate");
        if (invDateObj != null) invoiceDate = String.valueOf(invDateObj).trim();
        pinvNo = cleanDocNumber(meta.get("pinvNo"));
        Object pinvDateObj = meta.get("pinvDate");
        if (pinvDateObj != null) pinvDate = String.valueOf(pinvDateObj).trim();
      }
      boolean explicitProforma = "PROFORMA".equals(declaredDocType) || "PINV".equals(declaredDocType);
      boolean explicitInvoice = "INVOICE".equals(declaredDocType);
      boolean isProforma = explicitProforma || (!explicitInvoice && (!pinvNo.isBlank() || !pinvDate.isBlank()));
      String docTitle = isProforma ? "PROFORMA INVOICE" : "INVOICE";
      String docNoLabel = isProforma ? "PINV No." : "Invoice No.";
      String docDateLabel = isProforma ? "PINV Date" : "Date";
      String docNoValue = isProforma
          ? (!pinvNo.isBlank() ? pinvNo : (!invoiceNo.isBlank() ? invoiceNo : "—"))
          : (!invoiceNo.isBlank() ? invoiceNo : (!pinvNo.isBlank() ? pinvNo : "—"));
      String docDateValue = isProforma
          ? (!pinvDate.isBlank() ? pinvDate : (!invoiceDate.isBlank() ? invoiceDate : "—"))
          : (!invoiceDate.isBlank() ? invoiceDate : (!pinvDate.isBlank() ? pinvDate : "—"));

      // -------------------------------------------------------------------------
      // Compute totals and prepare derived values. Subtotal is the sum of
      // discounted line amounts.
      java.math.BigDecimal subtotal = java.math.BigDecimal.ZERO;
      java.math.BigDecimal grossTotal = java.math.BigDecimal.ZERO;
      java.math.BigDecimal discountSavings = java.math.BigDecimal.ZERO;
      // Table rows for items will be added later. We'll compute the totals
      // here while iterating through the items list.
      if (items != null) {
        for (java.util.Map<String,Object> it : items) {
          if (it == null) continue;
          java.math.BigDecimal rate = java.math.BigDecimal.ZERO;
          java.math.BigDecimal qty = java.math.BigDecimal.ZERO;
          java.math.BigDecimal disc = java.math.BigDecimal.ZERO;
          try { if (it.get("basePrice") != null) rate = new java.math.BigDecimal(it.get("basePrice").toString()); } catch(Exception ignored) {}
          try { if (it.get("qty") != null) qty = new java.math.BigDecimal(it.get("qty").toString()); } catch(Exception ignored) {}
          try { if (it.get("discount") != null) disc = new java.math.BigDecimal(it.get("discount").toString()); } catch(Exception ignored) {}
          // Normalise discount range to [0,100]
          if (disc.compareTo(java.math.BigDecimal.ZERO) < 0) disc = java.math.BigDecimal.ZERO;
          if (disc.compareTo(new java.math.BigDecimal("100")) > 0) disc = new java.math.BigDecimal("100");
          if (qty.compareTo(java.math.BigDecimal.ZERO) < 0) qty = java.math.BigDecimal.ZERO;
          if (rate.compareTo(java.math.BigDecimal.ZERO) < 0) rate = java.math.BigDecimal.ZERO;
          java.math.BigDecimal lineBase = rate.multiply(qty);
          grossTotal = grossTotal.add(lineBase);
          java.math.BigDecimal discounted = lineBase.multiply(java.math.BigDecimal.ONE.subtract(disc.divide(new java.math.BigDecimal("100"))));
          subtotal = subtotal.add(discounted);
        }
      }
      discountSavings = grossTotal.subtract(subtotal);
      if (discountSavings.compareTo(java.math.BigDecimal.ZERO) < 0) {
        discountSavings = java.math.BigDecimal.ZERO;
      }
      // Extract transport and taxes from totals map. Default to zero when missing.
      java.math.BigDecimal transport = java.math.BigDecimal.ZERO;
      java.math.BigDecimal cgst = java.math.BigDecimal.ZERO;
      java.math.BigDecimal sgst = java.math.BigDecimal.ZERO;
      java.math.BigDecimal igst = java.math.BigDecimal.ZERO;
      if (totals != null) {
        try { if (totals.get("transport") != null) transport = new java.math.BigDecimal(totals.get("transport").toString()); } catch(Exception ignored) {}
        try { if (totals.get("cgst") != null) cgst = new java.math.BigDecimal(totals.get("cgst").toString()); } catch(Exception ignored) {}
        try { if (totals.get("sgst") != null) sgst = new java.math.BigDecimal(totals.get("sgst").toString()); } catch(Exception ignored) {}
        try { if (totals.get("igst") != null) igst = new java.math.BigDecimal(totals.get("igst").toString()); } catch(Exception ignored) {}
      }
      java.math.BigDecimal totalBeforeTax = subtotal.add(transport);
      java.math.BigDecimal grand = totalBeforeTax.add(cgst).add(sgst).add(igst);
      // Compute amount in words using the Words utility. Append "Only" at the end.
      String totalInWords;
      try {
        totalInWords = com.vebops.util.Words.inIndianSystem(grand) + " Only";
      } catch(Exception e) {
        totalInWords = "";
      }
      if (totalInWords == null || totalInWords.isBlank()) {
        totalInWords = "Rupees " + invoicemoney(grand) + " Only";
      }

      // Determine place of supply. Follow the same precedence as Preview.jsx: first
      // meta.placeOfSupply; else buyer state; else consignee state; else company
      // state; else blank.
      String placeOfSupply = null;
      if (meta != null && meta.get("placeOfSupply") != null) {
        placeOfSupply = String.valueOf(meta.get("placeOfSupply"));
      }
      if ((placeOfSupply == null || placeOfSupply.isBlank()) && svc.getBuyerState() != null && !svc.getBuyerState().isBlank()) {
        placeOfSupply = svc.getBuyerState();
      }
      if ((placeOfSupply == null || placeOfSupply.isBlank()) && svc.getConsigneeState() != null && !svc.getConsigneeState().isBlank()) {
        placeOfSupply = svc.getConsigneeState();
      }
      if ((placeOfSupply == null || placeOfSupply.isBlank()) && company != null && company.getState() != null && !company.getState().isBlank()) {
        placeOfSupply = company.getState();
      }
      if (placeOfSupply == null || placeOfSupply.isBlank()) placeOfSupply = "—";

      // Extract meta values for buyer order, order date, dc no and wc no, serviceType
      String serviceTypeVal = meta != null && meta.get("serviceType") != null ? String.valueOf(meta.get("serviceType")) : "—";
      String buyerOrderNo = meta != null && meta.get("buyerOrderNo") != null ? String.valueOf(meta.get("buyerOrderNo")) : "—";
      String orderDate = meta != null && meta.get("orderDate") != null ? String.valueOf(meta.get("orderDate")) : "—";
      String dcNo = meta != null && meta.get("dcNo") != null ? String.valueOf(meta.get("dcNo")) : (meta != null && meta.get("deliveryChallanNo") != null ? String.valueOf(meta.get("deliveryChallanNo")) : "—");
      String wcNo = meta != null && meta.get("wcNo") != null ? String.valueOf(meta.get("wcNo")) : (meta != null && meta.get("workCompletionCertNo") != null ? String.valueOf(meta.get("workCompletionCertNo")) : "—");

      // -------------------------------------------------------------------------
      // Header: company logo & details on the left; invoice details on the right
      com.lowagie.text.pdf.PdfPTable headerTable = new com.lowagie.text.pdf.PdfPTable(2);
      headerTable.setWidthPercentage(100);
      headerTable.setWidths(new float[]{3f, 2f});
      // Left side: logo and company details
      com.lowagie.text.pdf.PdfPTable leftHeader = new com.lowagie.text.pdf.PdfPTable(2);
      leftHeader.setWidths(new float[]{1f, 4f});
      // Logo cell
      if (company != null && company.getLogoDataUrl() != null && company.getLogoDataUrl().startsWith("data:")) {
        try {
          String logoUrl = company.getLogoDataUrl();
          int comma = logoUrl.indexOf(',');
          if (comma >= 0) {
            String b64 = logoUrl.substring(comma + 1);
            byte[] imgBytes = java.util.Base64.getDecoder().decode(b64);
            com.lowagie.text.Image img = com.lowagie.text.Image.getInstance(imgBytes);
            // constrain logo height to ~50 pt and preserve aspect ratio
            float maxH = 50f;
            float maxW = 50f;
            float ratio = Math.min(maxW / img.getWidth(), maxH / img.getHeight());
            img.scaleToFit(img.getWidth() * ratio, img.getHeight() * ratio);
            com.lowagie.text.pdf.PdfPCell logoCell = new com.lowagie.text.pdf.PdfPCell(img, false);
            logoCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
            logoCell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_LEFT);
            logoCell.setVerticalAlignment(com.lowagie.text.Element.ALIGN_MIDDLE);
            leftHeader.addCell(logoCell);
          } else {
            leftHeader.addCell(new com.lowagie.text.pdf.PdfPCell() {{ setBorder(com.lowagie.text.Rectangle.NO_BORDER); }});
          }
        } catch (Exception e) {
          // If logo fails to load, add an empty cell to preserve layout
          com.lowagie.text.pdf.PdfPCell empty = new com.lowagie.text.pdf.PdfPCell();
          empty.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
          leftHeader.addCell(empty);
        }
      } else {
        // no logo
        com.lowagie.text.pdf.PdfPCell empty = new com.lowagie.text.pdf.PdfPCell();
        empty.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        leftHeader.addCell(empty);
      }
      // Company details cell
      com.lowagie.text.Paragraph compPara = new com.lowagie.text.Paragraph();
      if (company != null) {
        if (company.getName() != null && !company.getName().isBlank()) {
          compPara.add(new com.lowagie.text.Chunk(company.getName() + "\n", companyFont));
        }
        StringBuilder addr = new StringBuilder();
        if (company.getAddressLine1() != null && !company.getAddressLine1().isBlank()) addr.append(company.getAddressLine1());
        if (company.getAddressLine2() != null && !company.getAddressLine2().isBlank()) {
          if (addr.length() > 0) addr.append(", ");
          addr.append(company.getAddressLine2());
        }
        if (addr.length() > 0) compPara.add(new com.lowagie.text.Chunk(addr.toString() + "\n", regularFont));
        if (company.getGstin() != null && !company.getGstin().isBlank()) {
          compPara.add(new com.lowagie.text.Chunk("GSTIN: " + company.getGstin() + "\n", regularFont));
        }
        if (company.getPan() != null && !company.getPan().isBlank()) {
          compPara.add(new com.lowagie.text.Chunk("PAN: " + company.getPan() + "\n", regularFont));
        }
        if (company.getPhone() != null && !company.getPhone().isBlank()) {
          compPara.add(new com.lowagie.text.Chunk("Phone: " + company.getPhone() + "\n", regularFont));
        }
        if (company.getEmail() != null && !company.getEmail().isBlank()) {
          compPara.add(new com.lowagie.text.Chunk("Email: " + company.getEmail() + "\n", regularFont));
        }
      }
      com.lowagie.text.pdf.PdfPCell compCell = new com.lowagie.text.pdf.PdfPCell();
      compCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      compCell.addElement(compPara);
      leftHeader.addCell(compCell);
      // Add left header as cell to main header table
      com.lowagie.text.pdf.PdfPCell leftHeaderCell = new com.lowagie.text.pdf.PdfPCell(leftHeader);
      leftHeaderCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      headerTable.addCell(leftHeaderCell);
      // Right side: document title and invoice details
      com.lowagie.text.pdf.PdfPCell rightCell = new com.lowagie.text.pdf.PdfPCell();
      rightCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      // Title
      com.lowagie.text.Paragraph titlePara = new com.lowagie.text.Paragraph(docTitle, titleFont);
      titlePara.setAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
      rightCell.addElement(titlePara);
      // Invoice number/date
      com.lowagie.text.Paragraph detailsPara = new com.lowagie.text.Paragraph();
      detailsPara.setAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
      detailsPara.add(new com.lowagie.text.Chunk(docNoLabel + ": ", boldFont));
      detailsPara.add(new com.lowagie.text.Chunk(docNoValue + "\n", regularFont));
      detailsPara.add(new com.lowagie.text.Chunk(docDateLabel + ": ", boldFont));
      detailsPara.add(new com.lowagie.text.Chunk(docDateValue, regularFont));
      rightCell.addElement(detailsPara);
      headerTable.addCell(rightCell);
      headerTable.setSpacingAfter(0f);
      com.lowagie.text.pdf.PdfPCell headerWrapper = new com.lowagie.text.pdf.PdfPCell(headerTable);
      headerWrapper.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      headerWrapper.setPadding(18f);
      headerWrapper.setBackgroundColor(new java.awt.Color(248, 250, 252));
      com.lowagie.text.pdf.PdfPTable headerCard = new com.lowagie.text.pdf.PdfPTable(1);
      headerCard.setWidthPercentage(100);
      headerCard.getDefaultCell().setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      headerCard.addCell(headerWrapper);
      doc.add(headerCard);
      doc.add(new com.lowagie.text.Paragraph(" "));
      com.lowagie.text.pdf.draw.LineSeparator accentDivider = new com.lowagie.text.pdf.draw.LineSeparator();
      accentDivider.setLineColor(new java.awt.Color(226, 232, 240));
      accentDivider.setLineWidth(1.2f);
      doc.add(new com.lowagie.text.Chunk(accentDivider));
      doc.add(new com.lowagie.text.Paragraph(" "));

      // -------------------------------------------------------------------------
      // Bill To / Ship To sections
      com.lowagie.text.pdf.PdfPTable bcTable = new com.lowagie.text.pdf.PdfPTable(2);
      bcTable.setWidthPercentage(100);
      bcTable.setWidths(new float[]{1f, 1f});
      // Bill To
      com.lowagie.text.pdf.PdfPCell billCell = new com.lowagie.text.pdf.PdfPCell();
      billCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      com.lowagie.text.Paragraph billPara = new com.lowagie.text.Paragraph();
      billPara.add(new com.lowagie.text.Chunk("Bill To\n", boldFont));
      String buyerName = svc.getBuyerName() != null ? svc.getBuyerName().toUpperCase() : "";
      billPara.add(new com.lowagie.text.Chunk(buyerName + "\n", boldFont));
      String buyerAddr = svc.getBuyerAddress() != null ? svc.getBuyerAddress() : "";
      if (!buyerAddr.isBlank()) billPara.add(new com.lowagie.text.Chunk(buyerAddr + "\n", regularFont));
      if (svc.getBuyerPin() != null && !svc.getBuyerPin().isBlank()) billPara.add(new com.lowagie.text.Chunk(svc.getBuyerPin() + "\n", regularFont));
      if (svc.getBuyerState() != null && !svc.getBuyerState().isBlank()) billPara.add(new com.lowagie.text.Chunk(svc.getBuyerState() + "\n", regularFont));
      if (svc.getBuyerGst() != null && !svc.getBuyerGst().isBlank()) billPara.add(new com.lowagie.text.Chunk("GSTIN: " + svc.getBuyerGst() + "\n", regularFont));
      if (svc.getBuyerContact() != null && !svc.getBuyerContact().isBlank()) billPara.add(new com.lowagie.text.Chunk("Contact: " + svc.getBuyerContact() + "\n", regularFont));
      billCell.addElement(billPara);
      bcTable.addCell(billCell);
      // Ship To
      com.lowagie.text.pdf.PdfPCell shipCell = new com.lowagie.text.pdf.PdfPCell();
      shipCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      com.lowagie.text.Paragraph shipPara = new com.lowagie.text.Paragraph();
      shipPara.add(new com.lowagie.text.Chunk("Ship To\n", boldFont));
      String consName = svc.getConsigneeName() != null ? svc.getConsigneeName().toUpperCase() : "";
      shipPara.add(new com.lowagie.text.Chunk(consName + "\n", boldFont));
      String consAddr = svc.getConsigneeAddress() != null ? svc.getConsigneeAddress() : "";
      if (!consAddr.isBlank()) shipPara.add(new com.lowagie.text.Chunk(consAddr + "\n", regularFont));
      if (svc.getConsigneePin() != null && !svc.getConsigneePin().isBlank()) shipPara.add(new com.lowagie.text.Chunk(svc.getConsigneePin() + "\n", regularFont));
      if (svc.getConsigneeState() != null && !svc.getConsigneeState().isBlank()) shipPara.add(new com.lowagie.text.Chunk(svc.getConsigneeState() + "\n", regularFont));
      if (svc.getConsigneeGst() != null && !svc.getConsigneeGst().isBlank()) shipPara.add(new com.lowagie.text.Chunk("GSTIN: " + svc.getConsigneeGst() + "\n", regularFont));
      shipCell.addElement(shipPara);
      bcTable.addCell(shipCell);
      com.lowagie.text.pdf.PdfPCell bcWrapper = new com.lowagie.text.pdf.PdfPCell(bcTable);
      bcWrapper.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      bcWrapper.setPadding(16f);
      bcWrapper.setBackgroundColor(new java.awt.Color(255, 255, 255));
      com.lowagie.text.pdf.PdfPTable bcCard = new com.lowagie.text.pdf.PdfPTable(1);
      bcCard.setWidthPercentage(100);
      bcCard.getDefaultCell().setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      bcCard.addCell(bcWrapper);
      doc.add(bcCard);
      doc.add(new com.lowagie.text.Paragraph(" "));

      // -------------------------------------------------------------------------
      // Meta details: 3 columns × 2 rows
      com.lowagie.text.pdf.PdfPTable metaTable = new com.lowagie.text.pdf.PdfPTable(3);
      metaTable.setWidthPercentage(100);
      metaTable.setWidths(new float[]{1f,1f,1f});
      // Row 1
      metaTable.addCell(metaCell("Service Type", serviceTypeVal, smallBold, small));
      metaTable.addCell(metaCell("Place of Supply", placeOfSupply, smallBold, small));
      metaTable.addCell(metaCell("Buyer’s Order / PO No.", buyerOrderNo, smallBold, small));
      // Row 2
      metaTable.addCell(metaCell("PO / WO Date", orderDate, smallBold, small));
      metaTable.addCell(metaCell("Delivery Challan No.", dcNo, smallBold, small));
      metaTable.addCell(metaCell("Work Completion Cert No.", wcNo, smallBold, small));
      com.lowagie.text.pdf.PdfPCell metaWrapper = new com.lowagie.text.pdf.PdfPCell(metaTable);
      metaWrapper.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      metaWrapper.setPadding(14f);
      metaWrapper.setBackgroundColor(new java.awt.Color(248, 250, 252));
      com.lowagie.text.pdf.PdfPTable metaCard = new com.lowagie.text.pdf.PdfPTable(1);
      metaCard.setWidthPercentage(100);
      metaCard.getDefaultCell().setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      metaCard.addCell(metaWrapper);
      doc.add(metaCard);
      doc.add(new com.lowagie.text.Paragraph(" "));

      // -------------------------------------------------------------------------
      // Items table: Header row and data rows
      com.lowagie.text.pdf.PdfPTable itemsTable = new com.lowagie.text.pdf.PdfPTable(5);
      itemsTable.setWidthPercentage(100);
      itemsTable.setWidths(new float[]{3.2f, 1.2f, 0.9f, 1.2f, 1.3f});
      itemsTable.setHeaderRows(1);
      itemsTable.setSplitLate(false);
      itemsTable.setSplitRows(true);
      itemsTable.setSpacingBefore(4f);
      itemsTable.setSpacingAfter(8f);
      // Header cells with light background
      String[] headers = { "Item Description", "HSN/SAC", "Qty", "Rate", "Amount" };
      for (String h : headers) {
        com.lowagie.text.pdf.PdfPCell hc = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(h, boldFont));
        hc.setBackgroundColor(new java.awt.Color(240, 243, 255));
        hc.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_LEFT);
        hc.setPadding(5f);
        itemsTable.addCell(hc);
      }
      // Data rows
      if (items != null) {
        for (java.util.Map<String,Object> it : items) {
          if (it == null) continue;
          String desc = it.get("name") != null ? String.valueOf(it.get("name")) : "";
          String hsn = it.get("hsnSac") != null ? String.valueOf(it.get("hsnSac")) : "";
          java.math.BigDecimal qty = java.math.BigDecimal.ZERO;
          java.math.BigDecimal rate = java.math.BigDecimal.ZERO;
          java.math.BigDecimal disc = java.math.BigDecimal.ZERO;
          try { if (it.get("qty") != null) qty = new java.math.BigDecimal(it.get("qty").toString()); } catch(Exception ignored) {}
          try { if (it.get("basePrice") != null) rate = new java.math.BigDecimal(it.get("basePrice").toString()); } catch(Exception ignored) {}
          try { if (it.get("discount") != null) disc = new java.math.BigDecimal(it.get("discount").toString()); } catch(Exception ignored) {}
          if (qty.compareTo(java.math.BigDecimal.ZERO) < 0) qty = java.math.BigDecimal.ZERO;
          if (rate.compareTo(java.math.BigDecimal.ZERO) < 0) rate = java.math.BigDecimal.ZERO;
          if (disc.compareTo(java.math.BigDecimal.ZERO) < 0) disc = java.math.BigDecimal.ZERO;
          if (disc.compareTo(new java.math.BigDecimal("100")) > 0) disc = new java.math.BigDecimal("100");
          java.math.BigDecimal lineBase = rate.multiply(qty);
          java.math.BigDecimal discounted = lineBase.multiply(java.math.BigDecimal.ONE.subtract(disc.divide(new java.math.BigDecimal("100"))));
          // Description cell
          com.lowagie.text.pdf.PdfPCell dcell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(desc, regularFont));
          dcell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_LEFT);
          dcell.setPadding(5f);
          itemsTable.addCell(dcell);
          // HSN/SAC
          com.lowagie.text.pdf.PdfPCell hcell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(hsn, regularFont));
          hcell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
          hcell.setPadding(5f);
          itemsTable.addCell(hcell);
          // Qty
          com.lowagie.text.pdf.PdfPCell qcell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(qty.stripTrailingZeros().toPlainString(), regularFont));
          qcell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
          qcell.setPadding(5f);
          itemsTable.addCell(qcell);
          // Base Rate
          com.lowagie.text.pdf.PdfPCell rcell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(formatInr(rate), regularFont));
          rcell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
          rcell.setPadding(5f);
          itemsTable.addCell(rcell);
          // Amount (discounted)
          com.lowagie.text.pdf.PdfPCell amCell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(formatInr(discounted), regularFont));
          amCell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
          amCell.setPadding(5f);
          itemsTable.addCell(amCell);
        }
      }
      com.lowagie.text.pdf.PdfPCell itemsWrapper = new com.lowagie.text.pdf.PdfPCell(itemsTable);
      itemsWrapper.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      itemsWrapper.setPadding(12f);
      itemsWrapper.setBackgroundColor(new java.awt.Color(255, 255, 255));
      com.lowagie.text.pdf.PdfPTable itemsCard = new com.lowagie.text.pdf.PdfPTable(1);
      itemsCard.setWidthPercentage(100);
      itemsCard.getDefaultCell().setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      itemsCard.setSplitLate(false);
      itemsCard.setKeepTogether(false);
      itemsCard.addCell(itemsWrapper);
      doc.add(itemsCard);
      doc.add(new com.lowagie.text.Paragraph(" "));

      // -------------------------------------------------------------------------
      // Totals section: align to the right. We'll build a small table with two
      // columns (label and value). Only display taxes if greater than zero.
      com.lowagie.text.pdf.PdfPTable totalsTable = new com.lowagie.text.pdf.PdfPTable(2);
      totalsTable.setWidthPercentage(100);
      totalsTable.setWidths(new float[]{2f, 1f});
      // Helper to add a row
      java.util.function.BiConsumer<String,String> addTotalRow = (label, value) -> {
        com.lowagie.text.pdf.PdfPCell l = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(label, boldFont));
        l.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        l.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_LEFT);
        l.setPadding(6f);
        totalsTable.addCell(l);
        com.lowagie.text.pdf.PdfPCell v = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(value, boldFont));
        v.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
        v.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
        v.setPadding(6f);
        totalsTable.addCell(v);
      };
      if (discountSavings.compareTo(java.math.BigDecimal.ZERO) > 0) {
        addTotalRow.accept("Items Total:", formatInr(grossTotal));
        addTotalRow.accept("Discount Savings:", formatInr(discountSavings));
      }
      addTotalRow.accept("Subtotal:", formatInr(subtotal));
      if (transport.compareTo(java.math.BigDecimal.ZERO) > 0) {
        addTotalRow.accept("Transport:", formatInr(transport));
      }
      if (cgst.compareTo(java.math.BigDecimal.ZERO) > 0) {
        addTotalRow.accept("CGST:", formatInr(cgst));
      }
      if (sgst.compareTo(java.math.BigDecimal.ZERO) > 0) {
        addTotalRow.accept("SGST:", formatInr(sgst));
      }
      if (igst.compareTo(java.math.BigDecimal.ZERO) > 0) {
        addTotalRow.accept("IGST:", formatInr(igst));
      }
      addTotalRow.accept("Grand Total:", formatInr(grand));
      // Add amount in words spanning two columns
      com.lowagie.text.pdf.PdfPCell wordsLabel = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase("Amount in words:", boldFont));
      wordsLabel.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      wordsLabel.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_LEFT);
      wordsLabel.setPadding(6f);
      totalsTable.addCell(wordsLabel);
      com.lowagie.text.pdf.PdfPCell wordsValue = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(totalInWords, regularFont));
      wordsValue.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      wordsValue.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_LEFT);
      wordsValue.setPadding(6f);
      totalsTable.addCell(wordsValue);
      com.lowagie.text.pdf.PdfPCell totalsWrapper = new com.lowagie.text.pdf.PdfPCell(totalsTable);
      totalsWrapper.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      totalsWrapper.setPadding(12f);
      totalsWrapper.setBackgroundColor(new java.awt.Color(241, 245, 249));
      com.lowagie.text.pdf.PdfPTable totalsCard = new com.lowagie.text.pdf.PdfPTable(1);
      totalsCard.setWidthPercentage(45);
      totalsCard.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_RIGHT);
      totalsCard.getDefaultCell().setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      totalsCard.setSplitLate(false);
      totalsCard.setKeepTogether(true);
      totalsCard.addCell(totalsWrapper);
      doc.add(totalsCard);
      doc.add(new com.lowagie.text.Paragraph(" "));

      // -------------------------------------------------------------------------
      // Bank details, Terms & Conditions, Narration and Summary card
      // We'll create a two‑column layout: left for bank & terms, right for summary.
      com.lowagie.text.pdf.PdfPTable footTable = new com.lowagie.text.pdf.PdfPTable(2);
      footTable.setWidthPercentage(100);
      footTable.setWidths(new float[]{3f, 1.5f});
      // Left column content
      com.lowagie.text.Paragraph leftFoot = new com.lowagie.text.Paragraph();
      // Bank details
      leftFoot.add(new com.lowagie.text.Chunk("Company's Bank Details\n", smallBold));
      if (company != null) {
        leftFoot.add(new com.lowagie.text.Chunk((company.getBankName() != null ? "Bank Name: " + company.getBankName() + "\n" : ""), small));
        String acc = "";
        if (company.getAccNo() != null && !company.getAccNo().isBlank()) acc = company.getAccNo();
        if (!acc.isBlank()) leftFoot.add(new com.lowagie.text.Chunk("A/C No: " + acc + "\n", small));
        if (company.getBranch() != null && !company.getBranch().isBlank()) leftFoot.add(new com.lowagie.text.Chunk("Branch: " + company.getBranch() + "\n", small));
        if (company.getIfsc() != null && !company.getIfsc().isBlank()) leftFoot.add(new com.lowagie.text.Chunk("IFSC: " + company.getIfsc() + "\n", small));
      }
      // Terms & Conditions
      java.util.List<String> termsList = null;
      if (meta != null) {
        Object termsObj = meta.get("termsList");
        if (termsObj instanceof java.util.List<?> l) {
          // Safely convert each element to string
          java.util.List<String> tmp = new java.util.ArrayList<>();
          for (Object o : l) {
            if (o != null) {
              String s = o.toString().trim();
              if (!s.isEmpty()) tmp.add(s);
            }
          }
          if (!tmp.isEmpty()) termsList = tmp;
        }
        if ((termsList == null || termsList.isEmpty()) && meta.get("terms") != null) {
          String termsStr = String.valueOf(meta.get("terms"));
          java.util.List<String> tmp = new java.util.ArrayList<>();
          for (String line : termsStr.split("\\r?\\n|[;|]")) {
            String t = line.trim();
            if (!t.isEmpty()) tmp.add(t);
          }
          if (!tmp.isEmpty()) termsList = tmp;
        }
      }
      if (termsList != null && !termsList.isEmpty()) {
        leftFoot.add(new com.lowagie.text.Chunk("\nTerms & Conditions\n", smallBold));
        for (String term : termsList) {
          leftFoot.add(new com.lowagie.text.Chunk("• " + term + "\n", small));
        }
      }
      // Narration / Remarks
      if (meta != null && meta.get("narration") != null) {
        String narr = String.valueOf(meta.get("narration")).trim();
        if (!narr.isBlank()) {
          leftFoot.add(new com.lowagie.text.Chunk("\nNarration / Remarks\n", smallBold));
          leftFoot.add(new com.lowagie.text.Chunk(narr + "\n", small));
        }
      }
      com.lowagie.text.pdf.PdfPCell leftFootCell = new com.lowagie.text.pdf.PdfPCell(leftFoot);
      leftFootCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      footTable.addCell(leftFootCell);
      // Right column: summary card with Total and Amount Due
      com.lowagie.text.Paragraph rightCard = new com.lowagie.text.Paragraph();
      rightCard.add(new com.lowagie.text.Chunk("Total\n", smallBold));
      rightCard.add(new com.lowagie.text.Chunk(formatInr(grand) + "\n", titleFont));
      rightCard.add(new com.lowagie.text.Chunk("Amount Due\n", smallBold));
      rightCard.add(new com.lowagie.text.Chunk(formatInr(grand), titleFont));
      com.lowagie.text.pdf.PdfPCell rightFootCell = new com.lowagie.text.pdf.PdfPCell(rightCard);
      rightFootCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      rightFootCell.setBackgroundColor(new java.awt.Color(247,249,255));
      rightFootCell.setPadding(6f);
      footTable.addCell(rightFootCell);
      com.lowagie.text.pdf.PdfPCell footWrapper = new com.lowagie.text.pdf.PdfPCell(footTable);
      footWrapper.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      footWrapper.setPadding(16f);
      footWrapper.setBackgroundColor(new java.awt.Color(255, 255, 255));
      com.lowagie.text.pdf.PdfPTable footCard = new com.lowagie.text.pdf.PdfPTable(1);
      footCard.setWidthPercentage(100);
      footCard.getDefaultCell().setBorder(com.lowagie.text.Rectangle.NO_BORDER);
      footCard.addCell(footWrapper);
      doc.add(footCard);

      // -------------------------------------------------------------------------
      doc.close();
      return bout.toByteArray();
    } catch(Exception ex) {
      return new byte[0];
    }
  }

  private static String safe(String s){ return s==null? "" : s; }
  private static PdfPCell partyCard(String title, Color border, Font label, Font value,
                                    String name, String address, String phone,
                                    String gst, String stateName, String stateCode,
                                    String email, String website) {
    PdfPCell cell = new PdfPCell();
    cell.setBorderColor(border);
    cell.setPadding(10f);
    Paragraph p = new Paragraph(title, label);
    p.setSpacingAfter(6f);
    cell.addElement(p);

    cell.addElement(detailParagraph("Company Name", name, value));
    cell.addElement(detailParagraph("Address", address, value));
    cell.addElement(detailParagraph("Phone/Cell", phone, value));
    cell.addElement(detailParagraph("GSTIN/UIN", gst, value));
    cell.addElement(detailParagraph("State Name & Code", formatState(stateName, stateCode), value));
    cell.addElement(detailParagraph("Email", email, value));
    if (!website.isBlank()) {
      cell.addElement(detailParagraph("Website", website, value));
    }
    return cell;
  }

  private static PdfPCell supplierCard(Color border, Font label, Font value,
                                       String name, String address, String gst,
                                       String stateName, String stateCode) {
    PdfPCell cell = new PdfPCell();
    cell.setBorderColor(border);
    cell.setPadding(10f);
    Paragraph p = new Paragraph("Supplier (Bill From)", label);
    p.setSpacingAfter(6f);
    cell.addElement(p);
    cell.addElement(detailParagraph("Supplier Name", name, value));
    cell.addElement(detailParagraph("Address", address, value));
    cell.addElement(detailParagraph("GSTIN/UIN", gst, value));
    cell.addElement(detailParagraph("State Name & Code", formatState(stateName, stateCode), value));
    return cell;
  }

  private static Paragraph detailParagraph(String label, String data, Font valueFont) {
    Paragraph para = new Paragraph();
    para.setLeading(12f);
    Chunk bold = new Chunk(label + ": ", new Font(valueFont.getFamily(), valueFont.getSize(), Font.BOLD, valueFont.getColor()));
    para.add(bold);
    para.add(new Chunk(data == null || data.isBlank() ? "—" : data, valueFont));
    return para;
  }

  private static PdfPCell poMetaCell(String labelText, String valueText, Font labelFont, Font valueFont) {
    Paragraph p = new Paragraph();
    p.add(new Chunk(labelText + ":\n", labelFont));
    p.add(new Chunk(valueText == null || valueText.isBlank() ? "—" : valueText, valueFont));
    PdfPCell cell = new PdfPCell(p);
    cell.setBorder(Rectangle.NO_BORDER);
    cell.setPadding(6f);
    return cell;
  }

  private static void addPoHeaderCell(PdfPTable table, String text, Font font, Color bg) {
    PdfPCell cell = new PdfPCell(new Phrase(text, font));
    cell.setBackgroundColor(bg);
    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
    cell.setPadding(8f);
    cell.setBorder(Rectangle.NO_BORDER);
    cell.setBorderColor(bg);
    table.addCell(cell);
  }

  private static PdfPCell lineCell(String text, Font font, int align) {
    PdfPCell cell = new PdfPCell(new Phrase(text == null ? "" : text, font));
    cell.setHorizontalAlignment(align);
    cell.setPadding(7f);
    cell.setBorderColor(new Color(230, 233, 236));
    return cell;
  }

  private static String formatQuantity(BigDecimal qty) {
    if (qty == null) return "";
    BigDecimal normalized = qty.stripTrailingZeros();
    return normalized.scale() < 0 ? normalized.toPlainString() : normalized.toPlainString();
  }

  private static String formatMoney(BigDecimal value) {
    BigDecimal normalized = value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    DecimalFormat df = new DecimalFormat("#,##0.00");
    return df.format(normalized);
  }

  private static String formatState(String name, String code) {
    String n = name == null ? "" : name.trim();
    String c = code == null ? "" : code.trim();
    if (n.isEmpty() && c.isEmpty()) {
      return "";
    }
    if (c.isEmpty()) {
      return n;
    }
    if (n.isEmpty()) {
      return "Code: " + c;
    }
    return n + " – Code: " + c;
  }

  private static PdfPCell totalsLabel(String text, Font font) {
    PdfPCell cell = new PdfPCell(new Phrase(text, font));
    cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
    cell.setPadding(4f);
    cell.setBorder(Rectangle.NO_BORDER);
    return cell;
  }

  private static PdfPCell totalsValue(String text, Font font) {
    PdfPCell cell = new PdfPCell(new Phrase(text, font));
    cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
    cell.setPadding(4f);
    cell.setBorder(Rectangle.NO_BORDER);
    return cell;
  }

  private static String rateLabel(BigDecimal rate) {
    if (rate == null) {
      return "0";
    }
    BigDecimal normalized = rate.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros();
    return normalized.toPlainString();
  }
  private static String invoicemoney(BigDecimal v){
    return (v==null? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP).toPlainString();
  }
  private static String formatInr(java.math.BigDecimal value) {
    java.math.BigDecimal normalized = (value == null ? java.math.BigDecimal.ZERO : value)
        .setScale(2, java.math.RoundingMode.HALF_UP);
    java.text.NumberFormat fmt = java.text.NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
    fmt.setMaximumFractionDigits(2);
    fmt.setMinimumFractionDigits(2);
    return fmt.format(normalized);
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

  private static void addMetaRow(PdfPTable table, String labelText, String valueText, Font labelFont, Font valueFont) {
    PdfPCell labelCell = new PdfPCell(new Phrase(labelText, labelFont));
    labelCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
    labelCell.setPaddingBottom(4f);
    table.addCell(labelCell);

    PdfPCell valueCell = new PdfPCell(new Phrase(valueText, valueFont));
    valueCell.setBorder(com.lowagie.text.Rectangle.NO_BORDER);
    valueCell.setPaddingBottom(4f);
    table.addCell(valueCell);
  }

  private static String assignedEngineerName(WorkOrder wo) {
    if (wo == null || wo.getAssignedFE() == null) {
      return "";
    }
    if (wo.getAssignedFE().getUser() != null) {
      return safe(wo.getAssignedFE().getUser().getDisplayName());
    }
    return safe(wo.getAssignedFE().getName());
  }

  private static String resolveSiteAddress(WorkOrder wo, ServiceRequest sr) {
    if (sr == null) {
      return "";
    }
    String[] candidates = {
      sr.getSiteAddress(),
      sr.getDescription()
    };
    for (String candidate : candidates) {
      if (candidate != null && !candidate.isBlank()) {
        return candidate;
      }
    }
    return "";
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
      Document doc = new Document(PageSize.A4, 36, 36, 48, 48);
      PdfWriter.getInstance(doc, bout);
      doc.open();

      Font title = new Font(Font.HELVETICA, 18, Font.BOLD);
      Font section = new Font(Font.HELVETICA, 12, Font.BOLD);
      Font label = new Font(Font.HELVETICA, 10, Font.BOLD);
      Font value = new Font(Font.HELVETICA, 10, Font.NORMAL);

      doc.add(new Paragraph("WORK COMPLETION CERTIFICATE", title));
      doc.add(new Paragraph("Generated on: " + java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm")
        .format(java.time.LocalDateTime.now()), value));
      doc.add(Chunk.NEWLINE);

      PdfPTable overview = new PdfPTable(2);
      overview.setWidthPercentage(100);
      overview.setWidths(new float[]{1.2f, 2.2f});
      addMetaRow(overview, "Work Order", safe(wo.getWan()), label, value);
      addMetaRow(overview, "Status", wo.getStatus() != null ? wo.getStatus().name() : "", label, value);
      ServiceRequest sr = wo.getServiceRequest();
      addMetaRow(overview, "Service Request", sr != null ? safe(sr.getSrn()) : "", label, value);
      addMetaRow(overview, "Service Type", sr != null && sr.getServiceType() != null ? sr.getServiceType().name() : "", label, value);
      addMetaRow(overview, "Assigned Engineer", safe(assignedEngineerName(wo)), label, value);
      addMetaRow(overview, "Customer", sr != null && sr.getCustomer() != null ? safe(sr.getCustomer().getName()) : "", label, value);
      addMetaRow(overview, "Customer PO", wo.getCustomerPO() != null ? safe(wo.getCustomerPO().getPoNumber()) : "", label, value);
      addMetaRow(overview, "Site Address", safe(resolveSiteAddress(wo, sr)), label, value);
      doc.add(overview);
      doc.add(Chunk.NEWLINE);

      if (sr != null && sr.getCustomer() != null) {
        Customer customer = sr.getCustomer();
        PdfPTable customerTbl = new PdfPTable(2);
        customerTbl.setWidthPercentage(100);
        customerTbl.setWidths(new float[]{1.2f, 2.2f});
        addMetaRow(customerTbl, "Customer Email", safe(customer.getEmail()), label, value);
        addMetaRow(customerTbl, "Customer Phone", safe(customer.getMobile()), label, value);
        doc.add(customerTbl);
        doc.add(Chunk.NEWLINE);
      }

      doc.add(new Paragraph("Progress Timeline", section));
      doc.add(Chunk.NEWLINE);

      PdfPTable progressTable = new PdfPTable(new float[]{0.6f, 1.4f, 2.2f, 1.4f, 1.6f});
      progressTable.setWidthPercentage(100);
      addHeader(progressTable, "#", "Status", "Remarks", "Updated By", "Timestamp");
      int idx = 1;
      for (WorkOrderProgress p : progress) {
        progressTable.addCell(new Phrase(String.valueOf(idx++), value));
        progressTable.addCell(new Phrase(p.getStatus() != null ? p.getStatus().name().replace('_', ' ') : "", value));
        progressTable.addCell(new Phrase(safe(p.getRemarks()), value));
        String by = "";
        if (p.getByFE() != null) {
          by = safe(p.getByFE().getUser() != null ? p.getByFE().getUser().getDisplayName() : p.getByFE().getName());
        }
        progressTable.addCell(new Phrase(by, value));
        progressTable.addCell(new Phrase(p.getCreatedAt() != null ? p.getCreatedAt().toString() : "", value));
      }
      if (progress.isEmpty()) {
        PdfPCell empty = new PdfPCell(new Phrase("No progress updates were recorded for this work order.", value));
        empty.setColspan(5);
        progressTable.addCell(empty);
      }
      doc.add(progressTable);
      doc.add(Chunk.NEWLINE);

      doc.add(new Paragraph("Photo Evidence", section));
      doc.add(Chunk.NEWLINE);
      java.util.List<WorkOrderProgressAttachment> photos = new java.util.ArrayList<>();
      for (WorkOrderProgress p : progress) {
        if (p.getAttachments() != null) {
          photos.addAll(p.getAttachments());
        }
      }
      if (photos.isEmpty()) {
        doc.add(new Paragraph("No photos were uploaded for this work order.", value));
      } else {
        PdfPTable photoTable = new PdfPTable(new float[]{0.7f, 2.6f, 1.4f, 1.3f});
        photoTable.setWidthPercentage(100);
        addHeader(photoTable, "#", "File Name", "Content Type", "Uploaded At");
        int pIdx = 1;
        for (WorkOrderProgressAttachment att : photos) {
          photoTable.addCell(new Phrase(String.valueOf(pIdx++), value));
          photoTable.addCell(new Phrase(safe(att.getFilename()), value));
          photoTable.addCell(new Phrase(safe(att.getContentType()), value));
          photoTable.addCell(new Phrase(att.getUploadedAt() != null ? att.getUploadedAt().toString() : "", value));
        }
        doc.add(photoTable);
      }

      doc.add(Chunk.NEWLINE);
      doc.add(new Paragraph("Completion Summary", section));
      doc.add(new Paragraph("This certificate confirms that the above work order has been completed with the recorded progress updates and supporting evidence.", value));
      doc.add(Chunk.NEWLINE);
      doc.add(new Paragraph("Authorised Signature", section));
      doc.add(new Paragraph("______________________________", value));
      doc.add(new Paragraph("Name & Designation", value));

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
