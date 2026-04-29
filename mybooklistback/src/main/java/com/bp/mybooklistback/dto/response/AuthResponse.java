package com.bp.mybooklistback.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponse {
    private String accessToken;
    private Long userId;
    private String nickname;
    private String profileImage;
}