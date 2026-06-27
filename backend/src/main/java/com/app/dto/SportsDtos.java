package com.app.dto;

import com.app.entity.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class SportsDtos {
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MemberDto {
        private Long id;
        private Long accountId;
        private String memberName;
        private String mobile;
        private String email;
        private String role;
        private String defaultPassword;
        private Boolean active;
        private LocalDateTime createdAt;
    }

    @Data
    public static class MemberRequest {
        @NotBlank private String memberName;
        private String mobile;
        private String email;
        private String role;
    }


    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MemberLoginDto {
        private Long sportsMemberId;
        private String memberName;
        private String mobile;
        private String role;
        private String defaultPassword;
        private Boolean created;
        private String message;
    }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EventDto {
        private Long id;
        private Long accountId;
        private String eventName;
        private Integer year;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal budgetAmount;
        private BigDecimal collectedAmount;
        private BigDecimal totalExpense;
        private BigDecimal balanceAmount;
        private SportsEventStatus status;
        private LocalDateTime createdAt;
    }

    @Data
    public static class EventRequest {
        @NotBlank private String eventName;
        @NotNull private Integer year;
        @NotNull private LocalDate startDate;
        @NotNull private LocalDate endDate;
        private BigDecimal budgetAmount;
    }

    @Data
    public static class StatusRequest {
        @NotNull private SportsEventStatus status;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ExpenseDto {
        private Long id;
        private Long accountId;
        private Long sportsEventId;
        private String eventName;
        private LocalDate expenseDate;
        private String category;
        private String vendorName;
        private String description;
        private BigDecimal amount;
        private PaymentMode paymentMode;
        private String transactionId;
        private String utr;
        private String chequeNumber;
        private String remarks;
        private ExpenseStatus status;
        private LocalDateTime createdAt;
    }

    @Data
    public static class ExpenseRequest {
        private Long sportsEventId;
        @NotNull private LocalDate expenseDate;
        @NotBlank private String category;
        private String vendorName;
        private String description;
        @NotNull @DecimalMin("0.01") private BigDecimal amount;
        @NotNull private PaymentMode paymentMode;
        private String transactionId;
        private String utr;
        private String chequeNumber;
        private String remarks;
        private ExpenseStatus status;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CollectionDto {
        private Long id;
        private Long accountId;
        private Long sportsEventId;
        private String eventName;
        private Long sportsMemberId;
        private String memberName;
        private String mobile;
        private BigDecimal expectedAmount;
        private BigDecimal collectedAmount;
        private BigDecimal openingBalance;
        private BigDecimal openingDue;
        private BigDecimal pendingAmount;
        private BigDecimal excessAmount;
        private BigDecimal carriedForwardAmount;
        private BigDecimal carriedForwardPendingAmount;
        private BigDecimal refundedAmount;
        private PaymentStatus paymentStatus;
        private String remarks;
        private ReceiptStatus status;
        private String voidReason;
        private LocalDateTime voidedAt;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    public static class DemandRequest {
        @NotNull private Long sportsEventId;
        @NotNull @DecimalMin("0.01") private BigDecimal expectedAmount;
        private List<Long> sportsMemberIds;
        private String remarks;
    }

    @Data
    public static class PaymentRequest {
        @NotNull private LocalDate paymentDate;
        @NotNull @DecimalMin("0.01") private BigDecimal amountPaid;
        @NotNull private PaymentMode paymentMode;
        private String transactionId;
        private String utr;
        private String chequeNumber;
        @NotBlank private String collectedBy;
        private String remarks;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ReceiptDto {
        private Long id;
        private Long sportsCollectionId;
        private LocalDate paymentDate;
        private BigDecimal amountPaid;
        private PaymentMode paymentMode;
        private String transactionId;
        private String utr;
        private String chequeNumber;
        private String collectedBy;
        private String receiptNumber;
        private String remarks;
        private ReceiptStatus status;
        private String voidReason;
        private LocalDateTime voidedAt;
        private LocalDateTime createdAt;
    }


    @Data
    public static class VoidReceiptRequest {
        @NotBlank private String voidReason;
    }
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CollectionSummaryDto {
        private Long sportsEventId;
        private BigDecimal totalExpected;
        private BigDecimal totalCollected;
        private BigDecimal totalOpeningBalance;
        private BigDecimal totalOpeningDue;
        private BigDecimal totalPending;
        private BigDecimal totalExcess;
        private BigDecimal totalRefunded;
        private long paidMembers;
        private long pendingMembers;
        private long partialMembers;
        private long excessMembers;
        private long totalMembers;
    }
}


