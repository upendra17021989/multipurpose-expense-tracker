package com.app.service;

import com.app.entity.*;
import com.app.exception.ResourceNotFoundException;
import com.app.repository.FestivalCollectionRepository;
import com.app.repository.FestivalCollectionReceiptRepository;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FestivalReceiptPdfServiceTest {
    @Test void exportsPaymentDetailsOnOnePage() throws Exception {
        Account account = Account.builder().accountName("Pramukh Glory Society").address("Ahmedabad, Gujarat").build();
        FestivalEvent festival = FestivalEvent.builder().festivalName("Navratri Celebration").year(2026).build();
        FestivalCollection collection = FestivalCollection.builder().id(10L).account(account).festivalEvent(festival)
                .flat(Flat.builder().blockName("A").flatNumber("101").ownerName("Sample Resident").build()).build();
        FestivalCollectionReceipt receipt = FestivalCollectionReceipt.builder().id(20L).festivalCollection(collection)
                .receiptNumber("FEST-3-101-1").paymentDate(LocalDate.of(2026, 9, 7)).amountPaid(new BigDecimal("2500.50"))
                .paymentMode(PaymentMode.UPI).utr("123456789012").collectedBy("Society Treasurer")
                .remarks("Contribution towards decorations and community celebrations.").build();
        byte[] bytes = FestivalReceiptPdfService.render(collection, receipt);
        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(bytes)))) {
            assertEquals(1, pdf.getNumberOfPages());
            String text = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            for (String expected : new String[]{"Navratri Celebration", "Pramukh Glory Society", "FEST-3-101-1", "2500.50", "123456789012", "Sample Resident"}) assertTrue(text.contains(expected), expected);
        }
        Path sample = Path.of("target", "receipt-preview.pdf");
        Files.write(sample, bytes);
    }

    @Test void rejectsAnotherAccountsCollectionBeforeReadingReceipt() {
        var collections = mock(FestivalCollectionRepository.class);
        var receipts = mock(FestivalCollectionReceiptRepository.class);
        when(collections.findByAccountIdAndId(1L, 10L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> new FestivalReceiptPdfService(collections, receipts).export(1L, 10L, 20L));
        verifyNoInteractions(receipts);
    }

    @Test void rejectsReceiptFromAnotherCollection() {
        var collections = mock(FestivalCollectionRepository.class);
        var receipts = mock(FestivalCollectionReceiptRepository.class);
        when(collections.findByAccountIdAndId(1L, 10L)).thenReturn(Optional.of(FestivalCollection.builder().id(10L).build()));
        when(receipts.findById(20L)).thenReturn(Optional.of(FestivalCollectionReceipt.builder().festivalCollection(FestivalCollection.builder().id(99L).build()).build()));
        assertThrows(ResourceNotFoundException.class, () -> new FestivalReceiptPdfService(collections, receipts).export(1L, 10L, 20L));
    }
}
