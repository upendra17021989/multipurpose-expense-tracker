package com.app.service.rag;

import org.junit.jupiter.api.Test;
import java.io.*;
import java.nio.charset.StandardCharsets;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import static org.junit.jupiter.api.Assertions.*;

class DocumentTextExtractorTest {
    private final DocumentTextExtractor extractor = new DocumentTextExtractor();
    @Test void extractsPdfWithPageCitations() throws Exception {
        var output = new ByteArrayOutputStream();
        try (var document = new Document(new PdfDocument(new PdfWriter(output)))) {
            document.add(new Paragraph("Insurance premium 1500"));
        }
        var chunks = extractor.extract(output.toByteArray(), "application/pdf");
        assertEquals(1, chunks.get(0).page());
        assertTrue(chunks.get(0).text().contains("1500"));
    }
    @Test void longTextIsBoundedAndPreserved() throws Exception {
        String text = "x".repeat(9001);
        var chunks = extractor.extract(text.getBytes(StandardCharsets.UTF_8), "text/plain");
        assertEquals(4, chunks.size());
        assertTrue(chunks.stream().allMatch(chunk -> chunk.text().length() <= 3000));
        assertEquals(text, chunks.stream().map(DocumentTextExtractor.Chunk::text).collect(java.util.stream.Collectors.joining()));
    }
    @Test void rejectsUnsupportedEmptyOversizedAndInvalidUtf8() {
        assertThrows(IOException.class, () -> extractor.extract(new byte[]{1}, "image/png"));
        assertThrows(IOException.class, () -> extractor.extract(new byte[0], "text/plain"));
        assertThrows(IOException.class, () -> extractor.extract(new byte[DocumentTextExtractor.MAX_BYTES + 1], "text/plain"));
        assertThrows(IOException.class, () -> extractor.extract(new byte[]{(byte)0xff}, "text/plain"));
        assertThrows(IOException.class, () -> extractor.extract("x".repeat(200001).getBytes(StandardCharsets.UTF_8), "text/plain"));
    }
}
