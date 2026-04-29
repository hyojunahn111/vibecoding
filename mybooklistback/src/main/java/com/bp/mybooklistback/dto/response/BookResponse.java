package com.bp.mybooklistback.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class BookResponse {

    private List<BookDocument> documents;
    private Meta meta;

    @Getter
    @NoArgsConstructor
    public static class BookDocument {
        private String title;
        private String contents;
        private String url;
        private String isbn;
        private String datetime;
        private List<String> authors;
        private String publisher;
        private List<String> translators;
        private Integer price;
        @JsonProperty("sale_price")
        private Integer salePrice;
        private String thumbnail;
        private String status;
    }

    @Getter
    @NoArgsConstructor
    public static class Meta {
        @JsonProperty("total_count")
        private Integer totalCount;
        @JsonProperty("pageable_count")
        private Integer pageableCount;
        @JsonProperty("is_end")
        private Boolean isEnd;
    }
}