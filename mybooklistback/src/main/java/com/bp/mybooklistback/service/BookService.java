package com.bp.mybooklistback.service;

import com.bp.mybooklistback.dto.response.BookResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
public class BookService {

    private final WebClient webClient;

    @Value("${kakao.rest-api-key}")
    private String kakaoRestApiKey;

    public BookResponse searchBooks(String query, int page, int size) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .scheme("https")
                        .host("dapi.kakao.com")
                        .path("/v3/search/book")
                        .queryParam("query", query)
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build())
                .header("Authorization", "KakaoAK " + kakaoRestApiKey)
                .retrieve()
                .bodyToMono(BookResponse.class)
                .block();
    }
}
