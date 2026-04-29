export interface Book {
  title: string;
  contents: string;
  url: string;
  isbn: string;
  datetime: string;
  authors: string[];
  publisher: string;
  translators: string[];
  price: number;
  sale_price: number;
  thumbnail: string;
  status: string;
}

export interface BookSearchResponse {
  documents: Book[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
}

export interface User {
  userId: number;
  nickname: string;
  profileImage: string;
  accessToken: string;
}

export interface Favorite {
  id: number;
  isbn: string;
  title: string;
  authors: string;
  thumbnail: string;
  publisher: string;
  publishedDate: string;
  contents: string;
  url: string;
  price: number;
  createdAt: string;
}