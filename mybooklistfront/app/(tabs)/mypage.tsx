import { CommonActions } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
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
import { useAuth } from '../../src/context/AuthContext';
import { favoriteApi, UnauthorizedError } from '../../src/services/api';
import { getAllRecords, getCompletedStats } from '../../src/services/bookRecordStorage';
import { BookRecord, Favorite } from '../../src/types';

const today = new Date();

const stars = (rating: number) => {
  const r = Math.round(rating);
  return '★'.repeat(r) + '☆'.repeat(5 - r);
};

export default function MyPageScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user, logout: authLogout } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [completedBooks, setCompletedBooks] = useState<BookRecord[]>([]);
  const [stats, setStats] = useState({ year: 0, month: 0, week: 0 });
  const [dailyExcerpt, setDailyExcerpt] = useState<{ text: string; bookTitle: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadCompleted();
      if (user) loadData();
    }, [user])
  );

  const loadCompleted = async () => {
    const [s, all] = await Promise.all([getCompletedStats(), getAllRecords()]);
    setStats(s);
    const completed = all
      .filter(r => r.status === 'completed')
      .sort((a, b) => (b.endDate || b.date).localeCompare(a.endDate || a.date))
      .slice(0, 3);
    setCompletedBooks(completed);

    const allExcerpts: { text: string; bookTitle: string }[] = [];
    all.forEach(r => {
      r.excerpts?.forEach(text => {
        if (text.trim()) allExcerpts.push({ text, bookTitle: r.title });
      });
    });
    if (allExcerpts.length > 0) {
      const start = new Date(today.getFullYear(), 0, 0).getTime();
      const dayOfYear = Math.floor((Date.now() - start) / 86400000);
      setDailyExcerpt(allExcerpts[dayOfYear % allExcerpts.length]);
    } else {
      setDailyExcerpt(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await favoriteApi.getAll();
      setFavorites(data);
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        await authLogout();
      }
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

  const logout = () => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await authLogout();
          navigation.getParent()?.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'index' }] })
          );
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
            <Text style={styles.bookCount}>즐겨찾기된 책 {favorites.length}권</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={[...favorites].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)}
        keyExtractor={item => item.isbn}
        ListHeaderComponent={
          <>
            {/* 완독한 책 통계 카드 */}
            <View style={styles.statsCard}>
              <Text style={styles.statsHeading}>완독한 책</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View style={styles.statCountRow}>
                    <Text style={styles.statCount}>{stats.year}</Text>
                    <Text style={styles.statUnit}>권</Text>
                  </View>
                  <Text style={styles.statLabel}>연간</Text>
                  <Text style={styles.statSub}>{today.getFullYear()}년</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={styles.statCountRow}>
                    <Text style={styles.statCount}>{stats.month}</Text>
                    <Text style={styles.statUnit}>권</Text>
                  </View>
                  <Text style={styles.statLabel}>월간</Text>
                  <Text style={styles.statSub}>{today.getMonth() + 1}월</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={styles.statCountRow}>
                    <Text style={styles.statCount}>{stats.week}</Text>
                    <Text style={styles.statUnit}>권</Text>
                  </View>
                  <Text style={styles.statLabel}>주간</Text>
                  <Text style={styles.statSub}>이번 주</Text>
                </View>
              </View>
            </View>

            {/* 다시 읽는 한 줄 */}
            <View style={styles.quoteCard}>
              <View style={styles.quoteAccent} />
              <View style={styles.quoteBody}>
                <Text style={styles.quoteLabel}>다시 읽는 한 줄</Text>
                {dailyExcerpt ? (
                  <>
                    <Text style={styles.quoteText}>"{dailyExcerpt.text}"</Text>
                    <Text style={styles.quoteSource} numberOfLines={1}>— {dailyExcerpt.bookTitle}</Text>
                  </>
                ) : (
                  <Text style={styles.quotePlaceholder}>
                    {'당신이 머물렀던 자리,\n그곳의 기록들을 기다리고 있습니다.'}
                  </Text>
                )}
              </View>
            </View>

            {/* 완독한 책 섹션 */}
            <View>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>완독한 책</Text>
                <TouchableOpacity onPress={() => router.push('/completed-books')}>
                  <Text style={styles.moreBtn}>더보기 ›</Text>
                </TouchableOpacity>
              </View>
              {completedBooks.length === 0 ? (
                <View style={styles.emptySmall}>
                  <Text style={styles.emptySmallText}>아직 완독한 책이 없습니다</Text>
                </View>
              ) : (
                completedBooks.map(book => (
                  <View key={book.id} style={styles.completedItem}>
                    {book.thumbnail ? (
                      <Image source={{ uri: book.thumbnail }} style={styles.thumbnail} />
                    ) : (
                      <View style={[styles.thumbnail, styles.noImage]}>
                        <Text style={styles.noImageText}>📚</Text>
                      </View>
                    )}
                    <View style={styles.bookInfo}>
                      <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                      <Text style={styles.bookAuthor} numberOfLines={1}>{book.authors?.join(', ')}</Text>
                      <Text style={styles.starsText}>{stars(book.rating)}</Text>
                      {book.endDate ? (
                        <Text style={styles.dateText}>완독 {book.endDate}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* 즐겨찾기 섹션 제목 */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>즐겨찾기한 책</Text>
              <TouchableOpacity onPress={() => router.push('/favorites')}>
                <Text style={styles.moreBtn}>더보기 ›</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookItem}
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
  statsCard: {
    margin: 16,
    marginBottom: 8,
    paddingVertical: 20,
    paddingHorizontal: 8,
    backgroundColor: '#4A90E2',
    borderRadius: 16,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  statsHeading: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statCountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  statCount: { fontSize: 36, fontWeight: '800', color: '#fff', lineHeight: 40 },
  statUnit: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)', paddingBottom: 3 },
  statLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 6 },
  statSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  statDivider: { width: 1, height: 56, backgroundColor: 'rgba(255,255,255,0.25)' },

  quoteCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFAF3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    overflow: 'hidden',
  },
  quoteAccent: { width: 4, backgroundColor: '#F5A623' },
  quoteBody: { flex: 1, padding: 14, gap: 6 },
  quoteLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C47E1A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  quoteText: { fontSize: 14, color: '#2a2a2a', lineHeight: 22, fontStyle: 'italic' },
  quoteSource: { fontSize: 12, color: '#999', fontWeight: '500' },
  quotePlaceholder: { fontSize: 13, color: '#bbb', lineHeight: 21, fontStyle: 'italic' },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    padding: 16,
    paddingBottom: 8,
  },
  moreBtn: { fontSize: 13, color: '#4A90E2', fontWeight: '500' },
  completedItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
    alignItems: 'flex-start',
  },
  starsText: { fontSize: 12, color: '#F5A623', letterSpacing: 1 },
  dateText: { fontSize: 11, color: '#aaa' },
  emptySmall: { paddingHorizontal: 16, paddingBottom: 12 },
  emptySmallText: { fontSize: 13, color: '#aaa' },
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