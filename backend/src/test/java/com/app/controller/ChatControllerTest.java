package com.app.controller;

import com.app.config.RagProperties;
import com.app.config.SecurityConfig;
import com.app.dto.ChatResponse;
import com.app.security.SocietyRoleAccessFilter;
import com.app.security.UserPrincipal;
import com.app.service.rag.ChatException;
import com.app.service.rag.ChatService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = ChatController.class, properties = {"debug=false", "spring.profiles.active=test",
        "spring.config.import=", "logging.level.root=WARN", "logging.level.org.springframework=WARN"},
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
        classes = {SecurityConfig.class, SocietyRoleAccessFilter.class}))
@Import({RagProperties.class, ChatControllerTest.TestSecurity.class})
@ContextConfiguration(classes = {ChatController.class, RagProperties.class,
        com.app.config.GlobalExceptionHandler.class, ChatControllerTest.TestSecurity.class})
class ChatControllerTest {
    @Autowired MockMvc mvc;
    @MockBean ChatService service;

    @TestConfiguration static class TestSecurity {
        @Bean SecurityFilterChain chatSecurity(HttpSecurity http) throws Exception {
            return http.csrf(csrf -> csrf.disable()).authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, error) -> response.setStatus(401)))
                    .build();
        }
    }

    @Test void unauthenticatedChatAndStatusAreDenied() throws Exception {
        mvc.perform(get("/chat/status")).andExpect(status().isUnauthorized());
        mvc.perform(post("/chat").contentType(MediaType.APPLICATION_JSON).content("{\"mode\":\"HELP\",\"message\":\"import\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test void principalComesFromAuthenticatedSession() throws Exception {
        var principal = UserPrincipal.builder().userId(2L).accountId(7L).build();
        when(service.chat(eq(principal), any())).thenReturn(new ChatResponse("Help", "HELP_SEARCH", List.of(), null));
        mvc.perform(post("/chat").with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                .contentType(MediaType.APPLICATION_JSON).content("{\"mode\":\"HELP\",\"message\":\"import\",\"accountId\":999}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.answer").value("Help"));
        verify(service).chat(eq(principal), any());
    }

    @Test void oversizedRequestsAreRejectedBeforeService() throws Exception {
        var principal = UserPrincipal.builder().userId(2L).accountId(7L).build();
        mvc.perform(post("/chat").with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                .contentType(MediaType.APPLICATION_JSON).content("{\"mode\":\"HELP\",\"message\":\"" + "x".repeat(2001) + "\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test void unknownModeReturnsBadRequest() throws Exception {
        var principal = UserPrincipal.builder().userId(2L).accountId(7L).build();
        mvc.perform(post("/chat").with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                .contentType(MediaType.APPLICATION_JSON).content("{\"mode\":\"WRITE\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test void chatErrorsRetainTheirStatusWithoutExposingProviderDetails() throws Exception {
        var principal = UserPrincipal.builder().userId(2L).accountId(7L).build();
        when(service.chat(any(), any())).thenThrow(new ChatException(HttpStatus.TOO_MANY_REQUESTS, "Please wait."));
        mvc.perform(post("/chat").with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                .contentType(MediaType.APPLICATION_JSON).content("{\"mode\":\"HELP\",\"message\":\"import\"}"))
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.message").value("Please wait."));
    }
}
