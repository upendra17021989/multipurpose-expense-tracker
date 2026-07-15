package com.app.controller;

import com.app.dto.DailyQuoteDto;
import com.app.service.DailyQuoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/personal/quote-of-day")
@RequiredArgsConstructor
public class PersonalQuoteController {
    private final DailyQuoteService dailyQuoteService;

    @GetMapping
    public DailyQuoteDto today() {
        return dailyQuoteService.getToday();
    }
}
