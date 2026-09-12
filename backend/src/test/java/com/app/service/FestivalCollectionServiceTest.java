package com.app.service;

import com.app.entity.FestivalCollection;
import com.app.entity.FestivalEvent;
import com.app.entity.Flat;
import com.app.repository.FestivalCollectionReceiptRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FestivalCollectionServiceTest {

    @Test
    void receiptNumberIncludesNormalizedBlockName() {
        FestivalCollectionReceiptRepository receipts = mock(FestivalCollectionReceiptRepository.class);
        FestivalCollection collection = FestivalCollection.builder()
                .id(10L)
                .festivalEvent(FestivalEvent.builder().id(3L).build())
                .flat(Flat.builder().blockName("H Block").flatNumber("403-A").build())
                .build();
        when(receipts.findByFestivalCollectionId(10L)).thenReturn(List.of());

        FestivalCollectionService service = new FestivalCollectionService(
                null, receipts, null, null, null, null, null);

        assertEquals("FEST-3-H-BLOCK-403-A-1", service.buildReceiptNumber(collection));
    }
}
