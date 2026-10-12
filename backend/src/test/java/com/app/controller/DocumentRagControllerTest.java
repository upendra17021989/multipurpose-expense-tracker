package com.app.controller;

import com.app.config.SecurityConfig;
import com.app.security.*;
import com.app.service.rag.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = DocumentRagController.class, properties = {"debug=false", "spring.profiles.active=test", "spring.config.import=", "logging.level.root=WARN"},
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = {SecurityConfig.class, SocietyRoleAccessFilter.class}))
@Import(ChatControllerTest.TestSecurity.class)
@ContextConfiguration(classes = {DocumentRagController.class, ChatControllerTest.TestSecurity.class})
class DocumentRagControllerTest {
    @Autowired MockMvc mvc;
    @MockBean PrivateDocumentRagService documents;
    @MockBean ChatService chat;
    private final UserPrincipal principal = UserPrincipal.builder().userId(2L).accountId(1L).build();

    @Test void anonymousRequestsCannotIndexReadOrAsk() throws Exception {
        mvc.perform(get("/personal/documents/5/rag")).andExpect(status().isUnauthorized());
        mvc.perform(post("/personal/documents/5/rag").contentType(MediaType.APPLICATION_JSON).content("{\"consent\":true}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/personal/documents/5/rag/ask").contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"premium\"}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(documents, chat);
    }
    @Test void oversizedPrivateQuestionsGetSafeErrorsBeforeService() throws Exception {
        mvc.perform(post("/personal/documents/5/rag/ask")
                .with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                .contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"" + "private".repeat(300) + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Provide valid JSON and a document question of 1-2000 characters."));
        verifyNoInteractions(documents, chat);
    }
    @Test void consentUsesAuthenticatedIdentity() throws Exception {
        when(documents.enable(eq(principal), eq(5L), eq(true))).thenReturn(new PrivateDocumentRagService.Status("QUEUED", null, null));
        mvc.perform(post("/personal/documents/5/rag")
                .with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                .contentType(MediaType.APPLICATION_JSON).content("{\"consent\":true,\"userId\":999}"))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.status").value("QUEUED"));
        verify(documents).enable(principal, 5L, true);
    }
    @Test void malformedJsonDoesNotExposeInputOrException() throws Exception {
        mvc.perform(post("/personal/documents/5/rag/ask")
                .with(authentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())))
                .contentType(MediaType.APPLICATION_JSON).content("{private-broken-json"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Provide valid JSON and a document question of 1-2000 characters."));
        verifyNoInteractions(documents, chat);
    }
}
