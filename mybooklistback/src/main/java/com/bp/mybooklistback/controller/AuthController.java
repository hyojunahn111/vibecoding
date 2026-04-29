package com.bp.mybooklistback.controller;

import com.bp.mybooklistback.dto.request.KakaoLoginRequest;
import com.bp.mybooklistback.dto.response.AuthResponse;
import com.bp.mybooklistback.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/kakao")
    public ResponseEntity<AuthResponse> kakaoLogin(@RequestBody KakaoLoginRequest request) {
        return ResponseEntity.ok(authService.kakaoLogin(request));
    }
}
