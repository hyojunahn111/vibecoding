package com.bp.mybooklistback.service;

import com.bp.mybooklistback.dto.request.KakaoLoginRequest;
import com.bp.mybooklistback.dto.response.AuthResponse;
import com.bp.mybooklistback.entity.User;
import com.bp.mybooklistback.repository.UserRepository;
import com.bp.mybooklistback.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final WebClient webClient;

    @Transactional
    public AuthResponse kakaoLogin(KakaoLoginRequest request) {
        Map<String, Object> kakaoUserInfo = getKakaoUserInfo(request.getAccessToken());

        Long kakaoId = Long.parseLong(kakaoUserInfo.get("id").toString());

        @SuppressWarnings("unchecked")
        Map<String, Object> properties = (Map<String, Object>) kakaoUserInfo.get("properties");
        String nickname = properties != null ? (String) properties.get("nickname") : null;
        String profileImage = properties != null ? (String) properties.get("profile_image") : null;

        @SuppressWarnings("unchecked")
        Map<String, Object> kakaoAccount = (Map<String, Object>) kakaoUserInfo.get("kakao_account");
        String email = kakaoAccount != null ? (String) kakaoAccount.get("email") : null;

        User user = userRepository.findByKakaoId(kakaoId)
                .orElseGet(() -> userRepository.save(
                        User.builder()
                                .kakaoId(kakaoId)
                                .nickname(nickname)
                                .email(email)
                                .profileImage(profileImage)
                                .build()));

        String token = jwtTokenProvider.generateToken(user.getId());

        return AuthResponse.builder()
                .accessToken(token)
                .userId(user.getId())
                .nickname(user.getNickname())
                .profileImage(user.getProfileImage())
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getKakaoUserInfo(String accessToken) {
        return webClient.get()
                .uri("https://kapi.kakao.com/v2/user/me")
                .header("Authorization", "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }
}
