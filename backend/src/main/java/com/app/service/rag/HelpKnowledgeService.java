package com.app.service.rag;

import com.app.config.RagProperties;
import com.app.entity.ChatEmbedding;
import com.app.repository.ChatEmbeddingRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HelpKnowledgeService {
    public record Section(String id, String title, String url, String text) {
        public String content() { return title + "\n" + text; }
    }
    private record Match(Section section, double score) {}
    private static final Set<String> STOP_WORDS = Set.of("a", "an", "and", "are", "as", "at", "be", "can",
            "do", "does", "for", "from", "how", "i", "in", "is", "it", "me", "my", "of", "on", "or", "the",
            "this", "to", "use", "what", "where", "with", "you", "your", "please", "tell");
    private final List<Section> sections;
    private final ChatEmbeddingRepository repository;
    private final OpenAiRagClient provider;
    private final RagProperties properties;
    private final ObjectMapper mapper;

    public HelpKnowledgeService(ChatEmbeddingRepository repository, OpenAiRagClient provider,
                                RagProperties properties, ObjectMapper mapper) throws IOException {
        this.repository = repository;
        this.provider = provider;
        this.properties = properties;
        this.mapper = mapper;
        try (var input = new ClassPathResource("chat/help.json").getInputStream()) {
            sections = List.of(mapper.readValue(input, Section[].class));
        }
        if (sections.isEmpty() || sections.size() > 100
                || sections.stream().map(Section::id).distinct().count() != sections.size())
            throw new IllegalStateException("Help collection must contain 1–100 unique sections");
        for (Section section : sections) {
            if (section.id() == null || section.id().length() > 64 || section.title() == null
                    || section.text() == null || section.text().isBlank() || section.content().length() > 6000
                    || section.url() == null || !section.url().matches("/[a-zA-Z0-9/_-]*"))
                throw new IllegalStateException("Invalid help section");
        }
    }

    public List<Section> search(String question, boolean semantic) {
        if (!semantic) return lexicalSearch(question);
        Map<String, double[]> vectors = indexedVectors();
        double[] query = provider.embed(List.of(question)).get(0);
        return sections.stream().map(section -> new Match(section, cosine(query, vectors.get(section.id()))))
                .filter(match -> match.score() >= 0.35)
                .sorted(Comparator.comparingDouble(Match::score).reversed()).limit(3)
                .map(Match::section).toList();
    }

    public List<Section> lexicalSearch(String question) {
        Set<String> terms = terms(question);
        if (terms.isEmpty()) return List.of();
        return sections.stream().map(section -> {
            Set<String> contentTerms = terms(section.content());
            Set<String> titleTerms = terms(section.title());
            double score = terms.stream().filter(contentTerms::contains)
                    .mapToDouble(term -> titleTerms.contains(term) ? 2 : 1).sum();
            return new Match(section, score);
        }).filter(match -> match.score() > 0)
                .sorted(Comparator.comparingDouble(Match::score).reversed()).limit(3)
                .map(Match::section).toList();
    }

    private Set<String> terms(String text) {
        return Arrays.stream(text.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
                .filter(term -> term.length() > 1 && !STOP_WORDS.contains(term))
                .map(term -> term.length() > 4 && term.endsWith("s") ? term.substring(0, term.length() - 1) : term)
                .collect(Collectors.toSet());
    }

    // Serialize first-use indexing on this instance. Persistence avoids re-embedding after a restart.
    private synchronized Map<String, double[]> indexedVectors() {
        Map<String, ChatEmbedding> saved = repository.findAllById(sections.stream().map(Section::id).toList())
                .stream().collect(Collectors.toMap(ChatEmbedding::getId, value -> value));
        Map<String, double[]> vectors = new HashMap<>();
        List<Section> missing = new ArrayList<>();
        for (Section section : sections) {
            ChatEmbedding cached = saved.get(section.id());
            if (cached != null && hash(section.content()).equals(cached.getContentHash())
                    && properties.getEmbeddingModel().equals(cached.getModel())) {
                try {
                    double[] vector = mapper.readValue(cached.getVectorJson(), double[].class);
                    cosine(vector, vector); // Validate even a cached vector before using it.
                    vectors.put(section.id(), vector);
                    continue;
                } catch (IOException | IllegalStateException ignored) {
                    // Corrupt entries are replaced; never mix stale or invalid vectors with current content.
                }
            }
            missing.add(section);
        }
        if (!missing.isEmpty()) {
            List<double[]> generated = provider.embed(missing.stream().map(Section::content).toList());
            List<ChatEmbedding> updates = new ArrayList<>();
            for (int i = 0; i < missing.size(); i++) {
                Section section = missing.get(i);
                ChatEmbedding value = new ChatEmbedding();
                value.setId(section.id());
                value.setContentHash(hash(section.content()));
                value.setModel(properties.getEmbeddingModel());
                try { value.setVectorJson(mapper.writeValueAsString(generated.get(i))); }
                catch (IOException ex) { throw new IllegalStateException("Cannot encode help vector"); }
                updates.add(value);
                vectors.put(section.id(), generated.get(i));
            }
            repository.saveAll(updates);
        }
        // Removed sections are never retrieved, regardless of residual cache rows.
        return vectors;
    }

    static double cosine(double[] left, double[] right) {
        if (left == null || right == null || left.length == 0 || left.length != right.length)
            throw new IllegalStateException("Embedding dimensions differ");
        double product = 0, leftNorm = 0, rightNorm = 0;
        for (int i = 0; i < left.length; i++) {
            if (!Double.isFinite(left[i]) || !Double.isFinite(right[i]))
                throw new IllegalStateException("Invalid vector");
            product += left[i] * right[i]; leftNorm += left[i] * left[i]; rightNorm += right[i] * right[i];
        }
        if (leftNorm == 0 || rightNorm == 0) throw new IllegalStateException("Zero vector");
        return product / Math.sqrt(leftNorm * rightNorm);
    }

    static String hash(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
