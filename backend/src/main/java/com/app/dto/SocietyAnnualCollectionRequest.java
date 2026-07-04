package com.app.dto;
import com.app.entity.PaymentMode;
import com.app.entity.SocietyCollectionType;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data
public class SocietyAnnualCollectionRequest {
    private Long flatId;
    @NotBlank @Pattern(regexp = "^\\d{4}-\\d{4}$", message = "Financial year must look like 2026-2027") private String financialYear;
    @NotNull private SocietyCollectionType collectionType;
    @NotBlank @Size(max = 255) private String sourceName;
    @NotNull private LocalDate paymentDate;
    @NotNull @DecimalMin(value = "0.01") private BigDecimal amount;
    @NotNull private PaymentMode paymentMode;
    @Size(max = 100) private String referenceNumber;
    @Size(max = 500) private String remarks;
}
