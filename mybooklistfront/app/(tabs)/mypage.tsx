import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { favoriteApi } from '../../src/services/api';
import { Favorite, User } from '../../src/types';

export default function MyPageScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const stored = await AsyncStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(true);
    try {
      const data = await favoriteApi.getAll();
      setFavorites(data);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (isbn: string, title: string) => {
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

  const logout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['user', 'accessToken']);
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {user && (
        <View style={styles.profile}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.nickname}>{user.nickname}</Text>
            <Text style={styles.bookCount}>저장된 책 {favorites.length}권</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.sectionTitle}>즐겨찾기한 책</Text>

      <FlatList
        data={favorites}
        keyExtractor={item => item.isbn}
        renderItem={({ item }) => (
          <View style={styles.bookItem}>
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
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>즐겨찾기한 책이 없습니다</Text>
              <Text style={styles.emptySubText}>책을 검색해서 즐겨찾기에 추가해보세요!</Text>
            </View>
          ) : null
        }
        refreshing={loading}
        onRefresh={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 24 },
  profileInfo: { flex: 1 },
  nickname: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  bookCount: { fontSize: 13, color: '#888', marginTop: 2 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: { fontSize: 12, color: '#888' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    padding: 16,
    paddingBottom: 8,
  },
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
  empty: { padding: 40, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 16, color: '#666', fontWeight: '500' },
  emptySubText: { fontSize: 14, color: '#aaa' },
});