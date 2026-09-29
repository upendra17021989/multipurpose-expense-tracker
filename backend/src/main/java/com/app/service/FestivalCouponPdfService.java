package com.app.service;

import com.app.entity.FestivalCoupon;
import com.app.repository.FestivalCouponSettingRepository;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service @RequiredArgsConstructor
public class FestivalCouponPdfService {
    public enum Orientation { PORTRAIT, LANDSCAPE }
    private static final int COLUMNS = 4;
    private static final int ROWS = 4;
    private static final int PER_PAGE = COLUMNS * ROWS;
    private static final float MARGIN = 20;
    private static final float GAP = 8;
    private static final DeviceRgb RED = new DeviceRgb(147, 24, 25);
    private static final DeviceRgb GOLD = new DeviceRgb(220, 151, 31);
    private static final DeviceRgb CREAM = new DeviceRgb(255, 248, 232);
    private static final DeviceRgb GREEN = new DeviceRgb(14, 49, 38);

    private final FestivalCouponService service;
    private final FestivalCouponSettingRepository settings;

    public byte[] export(Long accountId, Long userId, Long festivalId, Orientation orientation) {
        List<FestivalCoupon> items = service.printable(accountId, userId, festivalId);
        var setting = settings.findByAccountIdAndFestivalEventId(accountId, festivalId).orElse(null);
        String label = setting == null ? "Festival Coupon" : setting.getCouponName();
        String validOn = setting == null || setting.getValidOn() == null ? "EVENT DAY"
                : setting.getValidOn().format(DateTimeFormatter.ofPattern("dd MMM yyyy"));
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (PdfDocument pdf = new PdfDocument(new PdfWriter(output))) {
                PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
                PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
                PageSize page = orientation == Orientation.LANDSCAPE ? PageSize.A4.rotate() : PageSize.A4;
                float width = (page.getWidth() - 2 * MARGIN - (COLUMNS - 1) * GAP) / COLUMNS;
                float height = (page.getHeight() - 2 * MARGIN - (ROWS - 1) * GAP) / ROWS;
                for (int start = 0; start < items.size(); start += PER_PAGE) {
                    PdfCanvas canvas = new PdfCanvas(pdf.addNewPage(page));
                    for (int index = start; index < Math.min(start + PER_PAGE, items.size()); index++) {
                        int slot = index - start;
                        float x = MARGIN + (slot % COLUMNS) * (width + GAP);
                        float y = page.getHeight() - MARGIN - (slot / COLUMNS + 1) * height - (slot / COLUMNS) * GAP;
                        drawCoupon(canvas, items.get(index), label, validOn, x, y, width, height, regular, bold, orientation);
                    }
                    // A dashed guide runs through each row gutter for a straight knife cut.
                    canvas.saveState().setStrokeColor(GOLD).setLineWidth(0.65f).setLineDash(3, 3);
                    for (int row = 1; row < ROWS; row++) {
                        float y = page.getHeight() - MARGIN - row * height - (row - 0.5f) * GAP;
                        canvas.moveTo(MARGIN, y).lineTo(page.getWidth() - MARGIN, y).stroke();
                    }
                    canvas.restoreState();
                }
                if (items.isEmpty()) {
                    PdfCanvas canvas = new PdfCanvas(pdf.addNewPage(page));
                    write(canvas, regular, "No active festival coupons are available.", 12, MARGIN, page.getHeight() - MARGIN - 12, GREEN);
                }
            }
            return output.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to render festival coupons", exception);
        }
    }

    private void drawCoupon(PdfCanvas canvas, FestivalCoupon coupon, String label, String validOn,
                            float x, float y, float width, float height, PdfFont regular, PdfFont bold, Orientation orientation) {
        canvas.saveState();
        canvas.setFillColor(CREAM).rectangle(x, y, width, height).fill();
        canvas.setStrokeColor(RED).setLineWidth(2.5f).rectangle(x + 1.25f, y + 1.25f, width - 2.5f, height - 2.5f).stroke();
        canvas.setStrokeColor(GOLD).setLineWidth(0.8f).rectangle(x + 4, y + 4, width - 8, height - 8).stroke();
        canvas.setFillColor(RED).rectangle(x + 4, y + 4, width - 8, 27).fill();
        canvas.restoreState();

        String society = value(coupon.getAccount().getSocietyName(), coupon.getAccount().getAccountName());
        String festival = value(coupon.getFestivalEvent().getFestivalName(), "FESTIVAL");
        String flat = value(coupon.getFlat().getBlockName(), "") + "-" + value(coupon.getFlat().getFlatNumber(), "");
        if (orientation == Orientation.LANDSCAPE) {
            writeFitted(canvas, bold, society.toUpperCase(), 7, x + 11, y + height - 17, width - 22, GREEN);
            writeFitted(canvas, bold, festival.toUpperCase() + "  " + coupon.getFestivalEvent().getYear(), 10,
                    x + 11, y + height - 32, width - 22, RED);
            writeFitted(canvas, bold, value(label, "Festival Coupon").toUpperCase(), 14,
                    x + 11, y + height - 54, width - 22, GREEN);
            writeFitted(canvas, bold, flat, 9, x + 11, y + height - 70, width - 22, RED);
            writeFitted(canvas, regular, value(coupon.getFlat().getOwnerName(), "Resident"), 7,
                    x + 11, y + height - 81, width - 22, GREEN);
        } else {
            writeFitted(canvas, bold, society.toUpperCase(), 7, x + 11, y + height - 19, width - 22, GREEN);
            writeFitted(canvas, bold, festival.toUpperCase() + "  " + coupon.getFestivalEvent().getYear(), 9,
                    x + 11, y + height - 37, width - 22, RED);
            String title = value(label, "Festival Coupon").toUpperCase();
            int split = title.lastIndexOf(' ');
            if (split > 0) {
                writeFitted(canvas, bold, title.substring(0, split), 18, x + 11, y + height - 70, width - 22, RED);
                writeFitted(canvas, bold, title.substring(split + 1), 17, x + 11, y + height - 90, width - 22, GREEN);
            } else {
                writeFitted(canvas, bold, title, 17, x + 11, y + height - 80, width - 22, GREEN);
            }
            canvas.saveState().setStrokeColor(GOLD).setLineWidth(1).moveTo(x + 11, y + height - 103)
                    .lineTo(x + width - 11, y + height - 103).stroke().restoreState();
            writeFitted(canvas, bold, flat, 10, x + 11, y + 57, width - 22, RED);
            writeFitted(canvas, regular, value(coupon.getFlat().getOwnerName(), "Resident"), 7,
                    x + 11, y + 44, width - 22, GREEN);
        }
        writeFitted(canvas, bold, "VALID " + validOn.toUpperCase(), 7, x + 11, y + 20, width - 22, CREAM);
        writeFitted(canvas, bold, coupon.getCouponNumber(), 7, x + 11, y + 10, width - 22, CREAM);
    }

    private void writeFitted(PdfCanvas canvas, PdfFont font, String text, float size, float x, float y, float maxWidth, DeviceRgb color) {
        String printable = text == null ? "" : text.replaceAll("[^\\x20-\\x7E]", " ");
        while (!printable.isEmpty() && font.getWidth(printable, size) > maxWidth) {
            printable = printable.substring(0, printable.length() - 1);
        }
        write(canvas, font, printable, size, x, y, color);
    }

    private void write(PdfCanvas canvas, PdfFont font, String text, float size, float x, float y, DeviceRgb color) {
        canvas.saveState().beginText().setFontAndSize(font, size).setFillColor(color)
                .moveText(x, y).showText(text).endText().restoreState();
    }

    private String value(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }
}
