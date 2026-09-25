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

@Service @RequiredArgsConstructor
public class FestivalCouponPdfService {
    private final FestivalCouponService service; private final FestivalCouponSettingRepository settings;
    public byte[] export(Long accountId, Long userId, Long festivalId) {
        List<FestivalCoupon> items = service.printable(accountId, userId, festivalId);
        String label = settings.findByAccountIdAndFestivalEventId(accountId, festivalId).map(x -> x.getCouponName()).orElse("Festival Coupon");
        ByteArrayOutputStream output = new ByteArrayOutputStream(); DeviceRgb teal = new DeviceRgb(15, 118, 110);
        try (Document document = new Document(new PdfDocument(new PdfWriter(output)), PageSize.A4)) {
            document.setMargins(28, 28, 28, 28); Table grid = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
            for (FestivalCoupon coupon : items) {
                var festival = coupon.getFestivalEvent(); var flat = coupon.getFlat(); var account = coupon.getAccount();
                Div card = new Div().setPadding(14).setMargin(5).setBorder(new SolidBorder(teal, 1));
                card.add(new Paragraph(value(account.getSocietyName(), account.getAccountName())).setFontSize(11).setBold().setFontColor(teal));
                card.add(new Paragraph(festival.getFestivalName() + " " + festival.getYear()).setFontSize(15).setBold().setMarginBottom(2));
                card.add(new Paragraph(label).setFontSize(12).setBold().setFontColor(teal));
                card.add(new Paragraph(flat.getBlockName() + "-" + flat.getFlatNumber() + " | " + flat.getOwnerName()).setFontSize(10));
                card.add(new Paragraph("Coupon " + coupon.getSequenceNumber() + " | " + coupon.getCouponNumber()).setFontSize(11).setBold());
                grid.addCell(new Cell().setBorder(null).add(card));
            }
            if (items.isEmpty()) document.add(new Paragraph("No active festival coupons are available.")); else document.add(grid);
        }
        return output.toByteArray();
    }
    private String value(String preferred, String fallback) { return preferred == null || preferred.isBlank() ? fallback : preferred; }
}
