package com.app.service;

import com.app.entity.FestivalCoupon;
import com.app.repository.FestivalCouponSettingRepository;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.*;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.kernel.pdf.extgstate.PdfExtGState;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.renderer.DivRenderer;
import com.itextpdf.layout.renderer.DrawContext;
import com.itextpdf.layout.renderer.IRenderer;
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
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        DeviceRgb teal = new DeviceRgb(15, 118, 110);
        DeviceRgb dark = new DeviceRgb(18, 42, 52);
        DeviceRgb pale = new DeviceRgb(232, 247, 244);
        DeviceRgb muted = new DeviceRgb(83, 104, 112);
        try (Document document = new Document(new PdfDocument(new PdfWriter(output)), PageSize.A4)) {
            document.setMargins(28, 28, 28, 28);
            for (int pageStart = 0; pageStart < items.size(); pageStart += perPage) {
                if (pageStart > 0) document.add(new AreaBreak());
                int pageEnd = Math.min(items.size(), pageStart + perPage);
                int pageCount = pageEnd - pageStart;
                int columns = pageCount <= 2 ? 1 : pageCount <= 8 ? 2 : pageCount <= 15 ? 3 : 4;
                boolean compact = pageCount > 12;
                boolean extraCompact = pageCount > 20;
                float padding = extraCompact ? 4 : compact ? 6 : pageCount > 8 ? 8 : 12;
                float smallFont = extraCompact ? 6 : compact ? 7 : 9;
                float titleFont = extraCompact ? 8 : compact ? 10 : 15;
                float detailFont = extraCompact ? 6.5f : compact ? 8 : 10;
                float[] widths = new float[columns];
                java.util.Arrays.fill(widths, 1);
                Table grid = new Table(UnitValue.createPercentArray(widths)).useAllAvailableWidth();
                for (FestivalCoupon coupon : items.subList(pageStart, pageEnd)) {
                var festival = coupon.getFestivalEvent(); var flat = coupon.getFlat(); var account = coupon.getAccount();
                Div card = new Div().setKeepTogether(true).setMargin(extraCompact ? 1 : 3).setBorder(new SolidBorder(teal, 0.8f));
                Div header = new Div().setBackgroundColor(teal).setPaddingLeft(padding).setPaddingRight(padding)
                        .setPaddingTop(extraCompact ? 3 : 6).setPaddingBottom(extraCompact ? 3 : 6);
                header.add(new Paragraph(value(account.getSocietyName(), account.getAccountName()).toUpperCase())
                        .setFontSize(smallFont).setBold().setFontColor(pale).setMargin(0));
                header.add(new Paragraph(festival.getFestivalName() + " " + festival.getYear())
                        .setFontSize(titleFont).setBold().setFontColor(com.itextpdf.kernel.colors.ColorConstants.WHITE).setMargin(0));
                card.add(header);

                Div body = new Div().setPaddingLeft(padding).setPaddingRight(padding)
                        .setPaddingTop(extraCompact ? 3 : 7).setPaddingBottom(extraCompact ? 2 : 5);
                body.setNextRenderer(new CouponBodyRenderer(body, festival.getFestivalName()));
                body.add(new Paragraph(label.toUpperCase()).setFontSize(smallFont).setBold().setFontColor(teal).setMargin(0));
                body.add(new Paragraph(flat.getBlockName() + "-" + flat.getFlatNumber())
                        .setFontSize(titleFont).setBold().setFontColor(dark).setMargin(0));
                body.add(new Paragraph(value(flat.getOwnerName(), "Resident"))
                        .setFontSize(detailFont).setFontColor(muted).setMargin(0));
                card.add(body);

                Div footer = new Div().setBackgroundColor(pale).setPaddingLeft(padding).setPaddingRight(padding)
                        .setPaddingTop(extraCompact ? 3 : 5).setPaddingBottom(extraCompact ? 3 : 5);
                footer.add(new Paragraph("VALID  " + validOn.toUpperCase())
                        .setFontSize(detailFont).setBold().setFontColor(teal).setMargin(0));
                footer.add(new Paragraph("#" + coupon.getSequenceNumber() + "  |  " + coupon.getCouponNumber())
                        .setFontSize(smallFont).setBold().setFontColor(dark).setMargin(0));
                card.add(footer);
                grid.addCell(new Cell().setKeepTogether(true).setBorder(null).add(card));
                }
                document.add(grid);
            }
            if (items.isEmpty()) document.add(new Paragraph("No active festival coupons are available."));
        }
        return output.toByteArray();
    }
    private String value(String preferred, String fallback) { return preferred == null || preferred.isBlank() ? fallback : preferred; }

    private static class CouponBodyRenderer extends DivRenderer {
        private final String watermark;

        CouponBodyRenderer(Div body, String watermark) {
            super(body);
            this.watermark = watermark == null ? "" : watermark.trim().toUpperCase();
        }

        @Override
        public IRenderer getNextRenderer() {
            return new CouponBodyRenderer((Div) modelElement, watermark);
        }

        @Override
        public void drawBackground(DrawContext context) {
            super.drawBackground(context);
            if (watermark.isEmpty()) return;
            try {
                var box = getOccupiedAreaBBox();
                var font = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                float size = Math.min(25, (box.getWidth() - 12) * 1000 / font.getWidth(watermark, 1000));
                PdfCanvas canvas = new PdfCanvas(context.getDocument().getPage(getOccupiedArea().getPageNumber()));
                canvas.saveState().setExtGState(new PdfExtGState().setFillOpacity(0.09f))
                        .setFillColor(new DeviceRgb(15, 118, 110)).beginText().setFontAndSize(font, size)
                        .moveText(box.getLeft() + (box.getWidth() - font.getWidth(watermark, size)) / 2,
                                box.getBottom() + (box.getHeight() - size) / 2)
                        .showText(watermark).endText().restoreState();
            } catch (java.io.IOException exception) {
                throw new IllegalStateException("Unable to render coupon watermark", exception);
            }
        }
    }
}
