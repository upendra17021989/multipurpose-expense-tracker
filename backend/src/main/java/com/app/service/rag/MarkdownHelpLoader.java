package com.app.service.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** Loads only explicitly reviewed, packaged Markdown; never scans the repository. */
final class MarkdownHelpLoader {
    record Document(String id, String title, String url, String file) {}
    private static final int MAX_BYTES = 128 * 1024;
    private static final int CHUNK_SIZE = 4000;
    private static final Pattern HEADING = Pattern.compile("^#{1,6}\\s+(.+?)\\s*#*\\s*$");

    static List<HelpKnowledgeService.Section> load(ObjectMapper mapper) throws IOException {
        Document[] documents;
        try (var input = new ClassPathResource("chat/markdown.json").getInputStream()) {
            documents = mapper.readValue(input, Document[].class);
        }
        if (documents.length == 0 || documents.length > 100)
            throw new IllegalStateException("Markdown manifest must contain 1-100 documents");
        List<HelpKnowledgeService.Section> sections = new ArrayList<>();
        for (Document document : documents) {
            if (document.id() == null || !document.id().matches("[a-z0-9-]{1,40}")
                    || document.title() == null || document.title().isBlank() || document.title().length() > 200
                    || document.url() == null || !document.url().matches("/[a-zA-Z0-9/_-]*")
                    || document.file() == null || !document.file().matches("[a-z0-9-]+\\.md"))
                throw new IllegalStateException("Invalid Markdown manifest entry");
            try (var input = new ClassPathResource("chat/markdown/" + document.file()).getInputStream()) {
                byte[] bytes = input.readNBytes(MAX_BYTES + 1);
                if (bytes.length > MAX_BYTES) throw new IllegalStateException("Markdown document too large");
                sections.addAll(split(document, new String(bytes, StandardCharsets.UTF_8)));
            }
            if (sections.size() > 100) throw new IllegalStateException("Too many Markdown chunks");
        }
        return List.copyOf(sections);
    }

    static List<HelpKnowledgeService.Section> split(Document document, String markdown) {
        List<HelpKnowledgeService.Section> result = new ArrayList<>();
        String heading = document.title();
        StringBuilder body = new StringBuilder();
        String fence = null;
        for (String line : markdown.replace("\r\n", "\n").split("\n", -1)) {
            String stripped = line.stripLeading();
            if (stripped.startsWith("```") || stripped.startsWith("~~~")) {
                char marker = stripped.charAt(0);
                int length = 0;
                while (length < stripped.length() && stripped.charAt(length) == marker) length++;
                if (fence == null) fence = stripped.substring(0, length);
                else if (marker == fence.charAt(0) && length >= fence.length()
                        && stripped.substring(length).isBlank()) fence = null;
                body.append(line).append('\n');
                continue;
            }
            var match = HEADING.matcher(line);
            if (fence == null && match.matches()) {
                append(result, document, heading, body.toString());
                body.setLength(0);
                heading = match.group(1);
                if (heading.length() > 200) throw new IllegalStateException("Markdown heading too long");
            } else body.append(line).append('\n');
        }
        append(result, document, heading, body.toString());
        if (result.isEmpty()) throw new IllegalStateException("Empty Markdown document");
        // Preserve existing cache IDs for a document with one chunk.
        if (result.size() == 1) {
            var section = result.get(0);
            result.set(0, new HelpKnowledgeService.Section(document.id(), section.title(), section.url(), section.text()));
        }
        return List.copyOf(result);
    }

    private static void append(List<HelpKnowledgeService.Section> result, Document document,
                               String heading, String body) {
        String remaining = body.strip();
        int part = 0;
        while (!remaining.isEmpty()) {
            int end = Math.min(CHUNK_SIZE, remaining.length());
            if (end < remaining.length()) {
                int boundary = remaining.lastIndexOf('\n', end);
                if (boundary < CHUNK_SIZE / 2) boundary = remaining.lastIndexOf(' ', end);
                if (boundary >= CHUNK_SIZE / 2) end = boundary;
                if (Character.isHighSurrogate(remaining.charAt(end - 1))) end--;
            }
            String title = heading.equals(document.title()) ? heading : document.title() + " / " + heading;
            String id = document.id() + "-" + HelpKnowledgeService.hash(heading).substring(0, 12) + "-" + (++part);
            result.add(new HelpKnowledgeService.Section(id, title, document.url(), remaining.substring(0, end).strip()));
            if (result.size() > 100) throw new IllegalStateException("Too many Markdown chunks");
            remaining = remaining.substring(end).strip();
        }
    }
}
