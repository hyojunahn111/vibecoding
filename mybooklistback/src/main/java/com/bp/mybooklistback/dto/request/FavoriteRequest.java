package com.bp.mybooklistback.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class FavoriteRequest {
    private String isbn;
    private String title;
    private String authors;
    private String thumbnail;
    private String publisher;
    private String publishedDate;
    private String contents;
    private String url;
    private Integer price;
}