package com.bp.mybooklistback.dto.response;

import com.bp.mybooklistback.entity.Favorite;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class FavoriteResponse {
    private Long id;
    private String isbn;
    private String title;
    private String authors;
    private String thumbnail;
    private String publisher;
    private String publishedDate;
    private String contents;
    private String url;
    private Integer price;
    private LocalDateTime createdAt;

    public static FavoriteResponse from(Favorite favorite) {
        return FavoriteResponse.builder()
                .id(favorite.getId())
                .isbn(favorite.getIsbn())
                .title(favorite.getTitle())
                .authors(favorite.getAuthors())
                .thumbnail(favorite.getThumbnail())
                .publisher(favorite.getPublisher())
                .publishedDate(favorite.getPublishedDate())
                .contents(favorite.getContents())
                .url(favorite.getUrl())
                .price(favorite.getPrice())
                .createdAt(favorite.getCreatedAt())
                .build();
    }
}
