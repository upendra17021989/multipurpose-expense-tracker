package com.app.controller;

import com.app.dto.LoginRequest;
import com.app.dto.LoginResponse;
import com.app.dto.RegisterRequest;
import com.app.dto.UserDto;
import com.app.service.AuthService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserDto> register(@Valid @RequestBody RegisterRequest request) {
        log.info("Register request for mobile: {}", request.getMobile());
        UserDto user = authService.register(request);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login request for mobile: {}", request.getMobile());
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login/{accountId}")
    public ResponseEntity<LoginResponse> loginWithAccount(@Valid @RequestBody LoginRequest request, @PathVariable Long accountId) {
        log.info("Login request for mobile: {} with accountId: {}", request.getMobile(), accountId);
        LoginResponse response = authService.loginWithAccount(request, accountId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/validate")
    public ResponseEntity<String> validateToken() {
        return ResponseEntity.ok("Token is valid");
    }
}
