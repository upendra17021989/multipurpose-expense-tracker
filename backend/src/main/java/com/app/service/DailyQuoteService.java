package com.app.service;

import com.app.dto.DailyQuoteDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;

@Service
public class DailyQuoteService {
    private static final DailyQuoteDto FALLBACK = new DailyQuoteDto(
            "The happiness of your life depends upon the quality of your thoughts.",
            "Marcus Aurelius", "Local fallback", null, true);

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final URI providerUri;
    private volatile LocalDate cachedDate;
    private volatile DailyQuoteDto cachedQuote;

    public DailyQuoteService(ObjectMapper objectMapper,
                             @Value("${app.quote-of-day.url:https://zenquotes.io/api/today}") String providerUrl) {
        this.objectMapper = objectMapper;
        this.providerUri = URI.create(providerUrl);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    }

    public DailyQuoteDto getToday() {
        LocalDate today = LocalDate.now();
        DailyQuoteDto current = cachedQuote;
        if (today.equals(cachedDate) && current != null) return current;

        synchronized (this) {
            if (today.equals(cachedDate) && cachedQuote != null) return cachedQuote;
            cachedQuote = fetch().orElse(FALLBACK);
            cachedDate = today;
            return cachedQuote;
        }
    }

    private java.util.Optional<DailyQuoteDto> fetch() {
        try {
            HttpRequest request = HttpRequest.newBuilder(providerUri)
                    .timeout(Duration.ofSeconds(6))
                    .header("Accept", "application/json")
                    .header("User-Agent", "MultipurposeExpenseTracker/1.0")
                    .GET().build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) return java.util.Optional.empty();
            JsonNode item = objectMapper.readTree(response.body()).path(0);
            String quote = clean(item.path("q").asText());
            String author = clean(item.path("a").asText());
            if (quote == null || author == null || quote.length() > 600 || author.length() > 120) return java.util.Optional.empty();
            return java.util.Optional.of(new DailyQuoteDto(quote, author, "ZenQuotes", "https://zenquotes.io/", false));
        } catch (Exception ignored) {
            return java.util.Optional.empty();
        }
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
