package com.app.service.rag;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.springframework.stereotype.Component;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class DocumentTextExtractor {
    public record Chunk(int page, int part, String text, double[] vector) {}
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final int MAX_TEXT = 200_000;

    public List<Chunk> extract(byte[] bytes, String type) throws IOException {
        if (bytes.length > MAX_BYTES) throw new IOException("Document exceeds extraction limit");
        List<Chunk> chunks = new ArrayList<>();
        if ("application/pdf".equals(type)) {
            try (var pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(bytes)))) {
                if (pdf.getNumberOfPages() > 100) throw new IOException("PDF exceeds page limit");
                int length = 0;
                for (int page = 1; page <= pdf.getNumberOfPages(); page++) {
                    String text = PdfTextExtractor.getTextFromPage(pdf.getPage(page));
                    length += text.length();
                    if (length > MAX_TEXT) throw new IOException("Document exceeds text limit");
                    append(chunks, page, text);
                }
            }
        } else if ("text/plain".equals(type) || "text/markdown".equals(type)) {
            String text = StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString();
            if (text.length() > MAX_TEXT) throw new IOException("Document exceeds text limit");
            append(chunks, 1, text);
        } else throw new IOException("Only PDF and UTF-8 text documents can be indexed");
        if (chunks.isEmpty()) throw new IOException("No readable text; scanned PDFs require OCR");
        return List.copyOf(chunks);
    }

    private void append(List<Chunk> chunks, int page, String text) throws IOException {
        String remaining = text.replace('\u0000', ' ').strip();
        int part = 0;
        while (!remaining.isEmpty()) {
            int end = Math.min(3000, remaining.length());
            if (end < remaining.length()) {
                int boundary = remaining.lastIndexOf(' ', end);
                if (boundary > 1500) end = boundary;
                if (Character.isHighSurrogate(remaining.charAt(end - 1))) end--;
            }
            chunks.add(new Chunk(page, ++part, remaining.substring(0, end).strip(), null));
            if (chunks.size() > 100) throw new IOException("Document exceeds chunk limit");
            remaining = remaining.substring(end).strip();
        }
    }
}
