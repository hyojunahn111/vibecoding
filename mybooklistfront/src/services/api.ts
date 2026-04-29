import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookSearchResponse, Favorite } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8080';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('accessToken');
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export const authApi = {
  kakaoLogin: async (accessToken: string) => {
    const res = await fetch(`${BASE_URL}/auth/kakao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken }),
    });
    if (!res.ok) throw new Error('로그인 실패');
    return res.json();
  },
};

export const bookApi = {
  search: async (query: string, page = 1, size = 10): Promise<BookSearchResponse> => {
    const res = await authFetch(`/books/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}`);
    if (!res.ok) throw new Error('검색 실패');
    return res.json();
  },
};

export const favoriteApi = {
  getAll: async (): Promise<Favorite[]> => {
    const res = await authFetch('/favorites');
    if (!res.ok) throw new Error('즐겨찾기 조회 실패');
    return res.json();
  },

  add: async (book: {
    isbn: string;
    title: string;
    authors: string;
    thumbnail: string;
    publisher: string;
    publishedDate: string;
    contents: string;
    url: string;
    price: number;
  }): Promise<Favorite> => {
    const res = await authFetch('/favorites', {
      method: 'POST',
      body: JSON.stringify(book),
    });
    if (!res.ok) throw new Error('즐겨찾기 추가 실패');
    return res.json();
  },

  remove: async (isbn: string): Promise<void> => {
    const res = await authFetch(`/favorites/${isbn}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('즐겨찾기 삭제 실패');
  },

  check: async (isbn: string): Promise<boolean> => {
    const res = await authFetch(`/favorites/check/${isbn}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.isFavorite;
  },
};