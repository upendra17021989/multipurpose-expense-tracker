package com.app.service;

import com.app.entity.FestivalCollection;
import com.app.entity.FestivalCollectionReceipt;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.FestivalCollectionRepository;
import com.app.repository.FestivalCollectionReceiptRepository;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.properties.UnitValue;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.math.RoundingMode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FestivalReceiptPdfService {
    private final FestivalCollectionRepository collections;
    private final FestivalCollectionReceiptRepository receipts;

    @Transactional(readOnly = true)
    public byte[] export(Long accountId, Long collectionId, Long receiptId) {
        FestivalCollection collection = collections.findByAccountIdAndId(accountId, collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Festival collection not found"));
        FestivalCollectionReceipt receipt = receipts.findById(receiptId)
                .filter(item -> item.getFestivalCollection().getId().equals(collectionId))
                .orElseThrow(() -> new ResourceNotFoundException("Receipt not found"));
        return render(collection, receipt);
    }

    static byte[] render(FestivalCollection collection, FestivalCollectionReceipt receipt) {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        DeviceRgb teal = new DeviceRgb(15, 118, 110);
        try (Document doc = new Document(new PdfDocument(new PdfWriter(output)), PageSize.A4)) {
            doc.setMargins(48, 48, 48, 48);
            doc.setFontSize(11);
            var account = collection.getAccount();
            var festival = collection.getFestivalEvent();
            String society = account.getSocietyName();
            if (society == null || society.isBlank()) society = account.getAccountName();
            doc.add(new Paragraph(value(society)).setBold().setFontSize(24).setFontColor(teal));
            if (account.getAddress() != null && !account.getAddress().isBlank()) doc.add(new Paragraph(account.getAddress()).setFontSize(10));
            doc.add(new Paragraph("FESTIVAL CONTRIBUTION RECEIPT").setFontColor(teal).setBold().setMarginTop(24));
            doc.add(new Paragraph(value(festival.getFestivalName()) + " | " + festival.getYear()).setFontSize(18).setBold());
            doc.add(new Paragraph("Receipt No. " + value(receipt.getReceiptNumber()) + "\nPayment date: " + receipt.getPaymentDate().format(DateTimeFormatter.ofPattern("dd MMM yyyy"))).setMarginBottom(24));
            Table details = new Table(UnitValue.createPercentArray(new float[]{35, 65})).useAllAvailableWidth();
            row(details, "Received from", collection.getFlat().getOwnerName());
            row(details, "Flat / Block", value(collection.getFlat().getBlockName()) + " - " + value(collection.getFlat().getFlatNumber()));
            row(details, "Purpose", festival.getFestivalName() + " festival contribution");
            row(details, "Payment mode", String.valueOf(receipt.getPaymentMode()));
            row(details, "UTR", receipt.getUtr());
            row(details, "Cheque number", receipt.getChequeNumber());
            row(details, "Transaction ID", receipt.getTransactionId());
            row(details, "Collected by", receipt.getCollectedBy());
            doc.add(details);
            doc.add(new Paragraph("AMOUNT RECEIVED\nINR " + receipt.getAmountPaid().setScale(2, RoundingMode.HALF_UP).toPlainString())
                    .setBold().setFontSize(20).setFontColor(teal).setBackgroundColor(new DeviceRgb(235, 247, 244)).setPadding(20).setMarginTop(24));
            if (receipt.getRemarks() != null && !receipt.getRemarks().isBlank()) doc.add(new Paragraph("Remarks: " + receipt.getRemarks()).setMarginTop(18));
            doc.add(new Paragraph("Thank you for contributing to " + festival.getFestivalName() + ".").setMarginTop(30));
            doc.add(new Paragraph("This is a computer-generated acknowledgement of the payment recorded by the society.\nCheque payments are subject to realization. Retain this receipt for your records.").setFontSize(9).setFontColor(new DeviceRgb(100, 116, 125)).setMarginTop(16));
        }
        return output.toByteArray();
    }

    private static String value(String text) { return text == null || text.isBlank() ? "-" : text; }
    private static void row(Table table, String label, String text) {
        if (text == null || text.isBlank()) return;
        table.addCell(new Cell().add(new Paragraph(label).setBold()).setBorder(Border.NO_BORDER).setPadding(9));
        table.addCell(new Cell().add(new Paragraph(text)).setBorder(Border.NO_BORDER).setPadding(9));
    }
}
