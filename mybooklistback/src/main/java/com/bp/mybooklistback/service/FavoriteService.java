package com.bp.mybooklistback.service;

import com.bp.mybooklistback.dto.request.FavoriteRequest;
import com.bp.mybooklistback.dto.response.FavoriteResponse;
import com.bp.mybooklistback.entity.Favorite;
import com.bp.mybooklistback.entity.User;
import com.bp.mybooklistback.repository.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;

    @Transactional(readOnly = true)
    public List<FavoriteResponse> getFavorites(User user) {
        return favoriteRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(FavoriteResponse::from)
                .toList();
    }

    @Transactional
    public FavoriteResponse addFavorite(User user, FavoriteRequest request) {
        if (favoriteRepository.existsByUserAndIsbn(user, request.getIsbn())) {
            throw new IllegalStateException("이미 즐겨찾기에 추가된 도서입니다.");
        }

        Favorite favorite = Favorite.builder()
                .user(user)
                .isbn(request.getIsbn())
                .title(request.getTitle())
                .authors(request.getAuthors())
                .thumbnail(request.getThumbnail())
                .publisher(request.getPublisher())
                .publishedDate(request.getPublishedDate())
                .contents(request.getContents())
                .url(request.getUrl())
                .price(request.getPrice())
                .build();

        return FavoriteResponse.from(favoriteRepository.save(favorite));
    }

    @Transactional
    public void removeFavorite(User user, String isbn) {
        favoriteRepository.deleteByUserAndIsbn(user, isbn);
    }

    @Transactional(readOnly = true)
    public boolean isFavorite(User user, String isbn) {
        return favoriteRepository.existsByUserAndIsbn(user, isbn);
    }
}
