package com.app.dto;
import com.app.entity.SharedSplitType; import jakarta.validation.Valid; import jakarta.validation.constraints.*; import lombok.*; import java.math.BigDecimal; import java.time.*; import java.util.List;
public final class SharedExpenseDtos { private SharedExpenseDtos() {}
 @Data public static class GroupRequest { @NotBlank @Size(max=150) private String name; }
 @Data public static class GroupUpdateRequest { @NotBlank @Size(max=150) private String name; @NotNull private Boolean active; }
 @Data public static class MemberRequest { @NotBlank @Size(max=150) private String memberName; @Email private String email; private String mobile; }
 @Data public static class MemberUpdateRequest { @NotBlank @Size(max=150) private String memberName; @Email private String email; private String mobile; @NotNull private Boolean active; }
 @Data public static class AmountRow { @NotNull private Long memberId; @NotNull @DecimalMin("0.01") private BigDecimal amount; }
 @Data public static class ExpenseRequest { @NotBlank @Size(max=500) private String description; private String category; @NotNull private LocalDate expenseDate; @NotNull @DecimalMin("0.01") private BigDecimal totalAmount; @NotNull private SharedSplitType splitType; private Long paidByMemberId; @Valid private List<AmountRow> payers; @NotEmpty private List<Long> participantIds; @Valid private List<AmountRow> shares; }
 @Data public static class SettlementRequest { @NotNull private Long paidByMemberId; @NotNull private Long paidToMemberId; @NotNull @DecimalMin("0.01") private BigDecimal amount; @NotNull private LocalDate settlementDate; private String paymentMode; private String notes; }
 @Data public static class InvitationRequest { @Email private String email; private String mobile; }
 @Value @Builder public static class InvitationDto { Long id; Long groupId; String groupName; String invitedBy; String email; String mobile; String status; LocalDateTime createdAt; }
 @Value @Builder public static class MemberDto { Long id; Long userId; String memberName; String email; String mobile; Boolean active; }
 @Value @Builder public static class BalanceDto { Long memberId; String memberName; BigDecimal balance; }
 @Value @Builder public static class ExpenseDto { Long id; String description; String category; LocalDate expenseDate; BigDecimal totalAmount; SharedSplitType splitType; String paidBy; Boolean reversed; }
 @Value @Builder public static class ActivityDto { Long id; String activityType; String message; String actorName; LocalDateTime createdAt; }
 @Value @Builder public static class GroupDto { Long id; String name; Boolean active; List<MemberDto> members; List<ExpenseDto> expenses; List<BalanceDto> balances; List<ActivityDto> activities; }
}
