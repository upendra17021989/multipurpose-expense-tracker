package com.app.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChatRequest(
        @NotNull Mode mode,
        @Size(max = 2000) String message,
        @Size(max = 7) String month) {
    public enum Mode { HELP, EXPENSE_SUMMARY }
}
