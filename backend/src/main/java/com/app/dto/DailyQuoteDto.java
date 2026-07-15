package com.app.dto;

public record DailyQuoteDto(String quote, String author, String sourceName, String sourceUrl, boolean fallback) {
}
