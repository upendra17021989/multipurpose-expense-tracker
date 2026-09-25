package com.app.service;

import com.app.entity.FestivalCoupon;
import com.app.repository.FestivalCouponSettingRepository;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.time.format.DateTimeFormatter;

@Service @RequiredArgsConstructor
public class FestivalCouponPdfService {
    private final FestivalCouponService service; private final FestivalCouponSettingRepository settings;
    public byte[] export(Long accountId, Long userId, Long festivalId) {
        List<FestivalCoupon> items = service.printable(accountId, userId, festivalId);
        var setting = settings.findByAccountIdAndFestivalEventId(accountId, festivalId).orElse(null);
        String label = setting == null ? "Festival Coupon" : setting.getCouponName();
        String validOn = setting == null || setting.getValidOn() == null ? "-" : setting.getValidOn().format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        int perPage = setting == null || setting.getCouponsPerPage() == null ? 6 : setting.getCouponsPerPage();
        ByteArrayOutputStream output = new ByteArrayOutputStream(); DeviceRgb teal = new DeviceRgb(15, 118, 110);
        try (Document document = new Document(new PdfDocument(new PdfWriter(output)), PageSize.A4)) {
            document.setMargins(28, 28, 28, 28);
            for (int pageStart = 0; pageStart < items.size(); pageStart += perPage) {
                if (pageStart > 0) document.add(new AreaBreak());
                int pageEnd = Math.min(items.size(), pageStart + perPage);
                int pageCount = pageEnd - pageStart;
                int columns = pageCount <= 2 ? 1 : pageCount <= 8 ? 2 : pageCount <= 15 ? 3 : 4;
                boolean compact = pageCount > 12;
                boolean extraCompact = pageCount > 20;
                float padding = extraCompact ? 1.5f : compact ? 3 : pageCount > 8 ? 7 : pageCount > 6 ? 10 : 14;
                float societyFont = extraCompact ? 5.5f : compact ? 7 : 11;
                float festivalFont = extraCompact ? 7 : compact ? 9 : 15;
                float labelFont = extraCompact ? 6 : compact ? 8 : 12;
                float detailFont = extraCompact ? 5.5f : compact ? 7 : 10;
                float couponFont = extraCompact ? 5.5f : compact ? 7 : 11;
                float validityFont = extraCompact ? 5.5f : compact ? 7 : 11;
                float messageFont = extraCompact ? 4.5f : compact ? 5 : 8;
                float[] widths = new float[columns];
                java.util.Arrays.fill(widths, 1);
                Table grid = new Table(UnitValue.createPercentArray(widths)).useAllAvailableWidth();
                for (FestivalCoupon coupon : items.subList(pageStart, pageEnd)) {
                var festival = coupon.getFestivalEvent(); var flat = coupon.getFlat(); var account = coupon.getAccount();
                Div card = new Div().setKeepTogether(true).setPadding(padding).setMargin(extraCompact ? 1 : compact ? 2 : 4).setBorder(new SolidBorder(teal, 1));
                card.add(new Paragraph(value(account.getSocietyName(), account.getAccountName())).setFontSize(societyFont).setBold().setFontColor(teal).setMargin(0));
                card.add(new Paragraph(festival.getFestivalName() + " " + festival.getYear()).setFontSize(festivalFont).setBold().setMargin(0));
                card.add(new Paragraph(label).setFontSize(labelFont).setBold().setFontColor(teal).setMargin(0));
                card.add(new Paragraph(flat.getBlockName() + "-" + flat.getFlatNumber() + " | " + flat.getOwnerName()).setFontSize(detailFont).setMargin(0));
                card.add(new Paragraph("Coupon " + coupon.getSequenceNumber() + " | " + coupon.getCouponNumber()).setFontSize(couponFont).setBold().setMargin(0));
                card.add(new Paragraph("VALID ON: " + validOn).setFontSize(validityFont).setBold().setFontColor(teal).setMarginTop(compact ? 2 : 8).setMarginBottom(0));
                card.add(new Paragraph("Valid only on this date. This coupon cannot be used on any other day.").setFontSize(messageFont).setBold().setMargin(0));
                grid.addCell(new Cell().setKeepTogether(true).setBorder(null).add(card));
                }
                document.add(grid);
            }
            if (items.isEmpty()) document.add(new Paragraph("No active festival coupons are available."));
        }
        return output.toByteArray();
    }
    private String value(String preferred, String fallback) { return preferred == null || preferred.isBlank() ? fallback : preferred; }
}
