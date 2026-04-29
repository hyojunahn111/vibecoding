package com.bp.mybooklistback.controller;

import com.bp.mybooklistback.dto.request.FavoriteRequest;
import com.bp.mybooklistback.dto.response.FavoriteResponse;
import com.bp.mybooklistback.entity.User;
import com.bp.mybooklistback.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<List<FavoriteResponse>> getFavorites(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(favoriteService.getFavorites(user));
    }

    @PostMapping
    public ResponseEntity<FavoriteResponse> addFavorite(
            @AuthenticationPrincipal User user,
            @RequestBody FavoriteRequest request) {
        return ResponseEntity.ok(favoriteService.addFavorite(user, request));
    }

    @DeleteMapping("/{isbn}")
    public ResponseEntity<Void> removeFavorite(
            @AuthenticationPrincipal User user,
            @PathVariable String isbn) {
        favoriteService.removeFavorite(user, isbn);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/check/{isbn}")
    public ResponseEntity<Map<String, Boolean>> checkFavorite(
            @AuthenticationPrincipal User user,
            @PathVariable String isbn) {
        boolean isFavorite = favoriteService.isFavorite(user, isbn);
        return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
    }
}