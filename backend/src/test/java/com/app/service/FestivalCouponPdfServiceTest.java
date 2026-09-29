package com.app.service;

import com.app.entity.*;
import com.app.repository.FestivalCouponSettingRepository;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class FestivalCouponPdfServiceTest {
    @ParameterizedTest @EnumSource(FestivalCouponPdfService.Orientation.class)
    void printsSixteenCouponsPerA4Page(FestivalCouponPdfService.Orientation orientation) throws Exception {
        FestivalCouponService service = mock(FestivalCouponService.class);
        FestivalCouponSettingRepository settings = mock(FestivalCouponSettingRepository.class);
        Account account = Account.builder().societyName("Pramukh Glory").build();
        FestivalEvent festival = FestivalEvent.builder().festivalName("Food").year(2026).build();
        List<FestivalCoupon> coupons = IntStream.rangeClosed(1, 17).mapToObj(number -> FestivalCoupon.builder()
                .account(account).festivalEvent(festival)
                .flat(Flat.builder().blockName("A").flatNumber(String.valueOf(number)).ownerName("Resident").build())
                .couponNumber("FC-" + String.format("%03d", number)).sequenceNumber(number).build()).toList();
        when(service.printable(1L, 2L, 3L)).thenReturn(coupons);
        when(settings.findByAccountIdAndFestivalEventId(1L, 3L)).thenReturn(Optional.of(
                FestivalCouponSetting.builder().couponName("Food Coupon").validOn(LocalDate.of(2026, 9, 29)).couponsPerPage(6).build()));

        byte[] result = new FestivalCouponPdfService(service, settings).export(1L, 2L, 3L, orientation);
        try (PdfDocument pdf = new PdfDocument(new PdfReader(new ByteArrayInputStream(result)))) {
            assertThat(pdf.getNumberOfPages()).isEqualTo(2);
            float expectedWidth = orientation == FestivalCouponPdfService.Orientation.PORTRAIT ? 595.28f : 841.89f;
            float expectedHeight = orientation == FestivalCouponPdfService.Orientation.PORTRAIT ? 841.89f : 595.28f;
            assertThat(pdf.getPage(1).getPageSize().getWidth()).isCloseTo(expectedWidth, org.assertj.core.data.Offset.offset(1f));
            assertThat(pdf.getPage(1).getPageSize().getHeight()).isCloseTo(expectedHeight, org.assertj.core.data.Offset.offset(1f));
            String firstPage = PdfTextExtractor.getTextFromPage(pdf.getPage(1));
            String secondPage = PdfTextExtractor.getTextFromPage(pdf.getPage(2));
            assertThat(firstPage).contains("FC-001", "FC-016", "COUPON", "29 SEPT 2026").doesNotContain("FC-017");
            assertThat(secondPage).contains("FC-017").doesNotContain("FC-016");
        }
    }
}
