import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { favoriteApi, UnauthorizedError } from '../src/services/api';
import { Favorite } from '../src/types';

export default function FavoritesScreen() {
  const router = useRouter();
  const { logout: authLogout } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await favoriteApi.getAll();
      setFavorites([...data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        await authLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = (isbn: string, title: string) => {
    Alert.alert('즐겨찾기 삭제', `"${title}"을 즐겨찾기에서 제거할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await favoriteApi.remove(isbn);
          setFavorites(prev => prev.filter(f => f.isbn !== isbn));
        },
      },
    ]);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? favorites.filter(f => f.title.toLowerCase().includes(q)) : favorites;
  }, [favorites, query]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: '즐겨찾기한 책', headerBackTitle: '마이페이지' }} />

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="책 제목 검색"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.isbn}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookItem}
            activeOpacity={0.7}
            onPress={() => {
              const book = {
                title: item.title,
                contents: item.contents,
                url: item.url,
                isbn: item.isbn,
                datetime: item.publishedDate,
                authors: item.authors ? item.authors.split(', ') : [],
                publisher: item.publisher,
                translators: [],
                price: item.price ?? 0,
                sale_price: item.price ?? 0,
                thumbnail: item.thumbnail,
                status: '',
              };
              router.push({
                pathname: '/book/[isbn]',
                params: { isbn: item.isbn, book: JSON.stringify(book) },
              });
            }}
          >
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.noImage]}>
                <Text style={styles.noImageText}>📚</Text>
              </View>
            )}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>{item.authors}</Text>
              <Text style={styles.bookPublisher}>{item.publisher}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeFavorite(item.isbn, item.title)}
            >
              <Text style={styles.removeText}>★</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {query ? '검색 결과가 없습니다' : '즐겨찾기한 책이 없습니다'}
              </Text>
            </View>
          ) : null
        }
        refreshing={loading}
        onRefresh={loadData}
        contentContainerStyle={filtered.length === 0 && styles.emptyContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a', padding: 0 },
  clearBtn: { fontSize: 14, color: '#aaa' },

  bookItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    gap: 12,
  },
  thumbnail: { width: 52, height: 75, borderRadius: 4 },
  noImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: { fontSize: 20 },
  bookInfo: { flex: 1, gap: 3 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  bookAuthor: { fontSize: 12, color: '#666' },
  bookPublisher: { fontSize: 12, color: '#999' },
  removeBtn: { padding: 8 },
  removeText: { fontSize: 20, color: '#4A90E2' },

  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#aaa' },
});
