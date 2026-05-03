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

export type ReadingStatus = 'unread' | 'reading' | 'completed';

export interface BookRecord {
  id: string;
  date: string;          // YYYY-MM-DD (달력에서 클릭한 날짜)
  isbn: string;
  title: string;
  authors: string[];
  thumbnail: string;
  publisher: string;
  genre: string;
  status: ReadingStatus;
  isCompleted: boolean;
  startDate: string;     // YYYY-MM-DD
  endDate: string;       // YYYY-MM-DD (isCompleted=true일 때만)
  rating: number;        // 0–5
  excerpts: string[];
  createdAt: string;
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