package com.app.dto;
import com.app.entity.PaymentMode;
import com.app.entity.SocietyCollectionType;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data @Builder
public class SocietyAnnualCollectionDto {
    private Long id; private Long flatId; private String flatLabel; private String financialYear;
    private SocietyCollectionType collectionType; private String sourceName; private LocalDate paymentDate;
    private BigDecimal amount; private PaymentMode paymentMode; private String referenceNumber;
    private String transactionId; private String settlementId; private String narration; private String remarks;
}
