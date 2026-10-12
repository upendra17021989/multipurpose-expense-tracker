package com.app.service.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MarkdownHelpLoaderTest {
    private final MarkdownHelpLoader.Document document =
            new MarkdownHelpLoader.Document("guide", "Guide", "/assistant", "guide.md");

    @Test void splitsHeadingsAndRetainsCitationRoutes() {
        var sections = MarkdownHelpLoader.split(document, "# Guide\nIntroduction\n## Import\nChoose a file\n## Reports\nView totals");
        assertEquals(3, sections.size());
        assertEquals("Guide / Import", sections.get(1).title());
        assertEquals("Choose a file", sections.get(1).text());
        assertTrue(sections.stream().allMatch(section -> section.url().equals("/assistant")));
        var edited = MarkdownHelpLoader.split(document, "# Guide\nChanged intro\n## Import\nUpdated instructions\n## Reports\nView totals");
        assertEquals(sections.get(1).id(), edited.get(1).id());
        assertNotEquals(HelpKnowledgeService.hash(sections.get(1).content()), HelpKnowledgeService.hash(edited.get(1).content()));
    }

    @Test void headingsInsideCodeFencesRemainContent() {
        var sections = MarkdownHelpLoader.split(document, "# Guide\nExample\n````text\n## Code heading\n```\n## Still code\n````\n## Actual heading\nInstructions");
        assertEquals(2, sections.size());
        assertTrue(sections.get(0).text().contains("## Still code"));
        assertEquals("Guide / Actual heading", sections.get(1).title());
    }

    @Test void longSectionsAreBoundedWithoutLosingText() {
        String body = "x".repeat(10001);
        var sections = MarkdownHelpLoader.split(document, body);
        assertEquals(3, sections.size());
        assertTrue(sections.stream().allMatch(section -> section.text().length() <= 4000));
        assertEquals(body, sections.stream().map(HelpKnowledgeService.Section::text).collect(java.util.stream.Collectors.joining()));
        assertEquals(3, sections.stream().map(HelpKnowledgeService.Section::id).distinct().count());
    }

    @Test void packagedCorpusPreservesExistingHelpIdsAndContent() throws Exception {
        var corpus = MarkdownHelpLoader.load(new ObjectMapper());
        assertEquals(9, corpus.size());
        assertTrue(corpus.stream().anyMatch(section -> section.id().equals("expense-import") && section.text().contains("society")));
    }

    @Test void emptyAndExcessiveDocumentsAreRejected() {
        assertThrows(IllegalStateException.class, () -> MarkdownHelpLoader.split(document, "# Empty\n"));
        assertThrows(IllegalStateException.class, () -> MarkdownHelpLoader.split(document, "x".repeat(400001)));
    }
}
