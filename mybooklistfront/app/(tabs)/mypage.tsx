import { CommonActions } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
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
      .slice(0, 6);
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

  const sortedFavorites = [...favorites]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#A67B5B" />}
    >
      {/* ── 히어로 프로필 ── */}
      <View style={styles.heroSection}>
        <TouchableOpacity style={styles.logoutBtnTop} onPress={logout}>
          <Text style={styles.logoutTextTop}>로그아웃</Text>
        </TouchableOpacity>
        {user ? (
          <>
            <View style={[styles.avatarWrapper]}>
              {user.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.heroAvatar} />
              ) : (
                <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
                  <Text style={styles.heroAvatarText}>👤</Text>
                </View>
              )}
              <Image
                source={require('../../assets/bookfooddog1.png')}
                style={styles.dogDecor}
                resizeMode="contain"
                pointerEvents="none"
              />
            </View>
            <Text style={styles.heroNickname}>{user.nickname}</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>올해 {stats.year}권 완독</Text>
            </View>
          </>
        ) : (
          <>
            <View style={[styles.heroAvatar, styles.heroAvatarFallback]}>
              <Text style={styles.heroAvatarText}>👤</Text>
            </View>
            <Text style={styles.heroNickname}>로그인이 필요합니다</Text>
          </>
        )}
      </View>

      {/* ── 완독 통계 카드 ── */}
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

      {/* ── 다시 읽는 한 줄 ── */}
      <View style={styles.quoteCard}>
        <Text style={styles.quoteBg}>❝</Text>
        <View style={styles.quoteBody}>
          <Text style={styles.quoteLabel}>다시 읽는 한 줄</Text>
          {dailyExcerpt ? (
            <>
              <Text style={styles.quoteText}>{dailyExcerpt.text}</Text>
              <View style={styles.quoteSourceRow}>
                <View style={styles.quoteSourceBar} />
                <Text style={styles.quoteSource} numberOfLines={1}>{dailyExcerpt.bookTitle}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.quotePlaceholder}>
              {'당신이 머물렀던 자리,\n그곳의 기록들을 기다리고 있습니다.'}
            </Text>
          )}
        </View>
      </View>

      {/* ── 완독한 책 ── */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>완독한 책</Text>
          <TouchableOpacity onPress={() => router.push('/completed-books')}>
            <Text style={styles.moreBtn}>더보기 ›</Text>
          </TouchableOpacity>
        </View>
        {completedBooks.length === 0 ? (
          <View style={styles.emptyHorizontal}>
            <Text style={styles.emptySmallText}>아직 완독한 책이 없습니다</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {completedBooks.map(book => (
              <View key={book.id} style={styles.bookCard}>
                {book.thumbnail ? (
                  <Image source={{ uri: book.thumbnail }} style={styles.bookCardThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.bookCardThumb, styles.noImage]}>
                    <Text style={styles.noImageText}>📚</Text>
                  </View>
                )}
                <Text style={styles.bookCardTitle} numberOfLines={1}>{book.title}</Text>
                <Text style={styles.bookCardStars}>{stars(book.rating)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── 즐겨찾기한 책 ── */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>즐겨찾기한 책</Text>
          <TouchableOpacity onPress={() => router.push('/favorites')}>
            <Text style={styles.moreBtn}>더보기 ›</Text>
          </TouchableOpacity>
        </View>
        {sortedFavorites.length === 0 ? (
          <View style={styles.emptyHorizontal}>
            <Text style={styles.emptySmallText}>즐겨찾기한 책이 없습니다</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {sortedFavorites.map(item => (
              <TouchableOpacity
                key={item.isbn}
                style={styles.bookCard}
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
                <View>
                  {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.bookCardThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.bookCardThumb, styles.noImage]}>
                      <Text style={styles.noImageText}>📚</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.favRemoveBtn}
                    onPress={() => removeFavorite(item.isbn, item.title)}
                  >
                    <Text style={styles.favRemoveText}>★</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.bookCardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookCardAuthor} numberOfLines={1}>{item.authors}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF6EC' },

  // ── 히어로 프로필
  heroSection: {
    backgroundColor: '#F5EBE0',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 20,
  },
  logoutBtnTop: { position: 'absolute', top: 16, right: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  dogDecor: {
    position: 'absolute',
    top: -38,
    left: 8,
    width: 68,
    height: 68,
  },
  logoutTextTop: { fontSize: 12, color: '#A67B5B', fontWeight: '500' },
  heroAvatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 14 },
  heroAvatarFallback: {
    backgroundColor: '#EDE0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroAvatarText: { fontSize: 38 },
  heroNickname: { fontSize: 20, fontWeight: '700', color: '#3E2A1F', marginBottom: 10 },
  heroBadge: {
    backgroundColor: '#D98743',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  heroBadgeText: { fontSize: 12, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },

  // ── 통계 카드
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 20,
    paddingHorizontal: 8,
    backgroundColor: '#F5EBE0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5D5C5',
    shadowColor: '#A67B5B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statsHeading: {
    fontSize: 11,
    color: '#A67B5B',
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statCountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  statCount: { fontSize: 36, fontWeight: '800', color: '#3E2A1F', lineHeight: 40 },
  statUnit: { fontSize: 13, fontWeight: '600', color: '#A67B5B', paddingBottom: 3 },
  statLabel: { fontSize: 13, fontWeight: '700', color: '#4A3525', marginTop: 6 },
  statSub: { fontSize: 11, color: '#A67B5B' },
  statDivider: { width: 1, height: 56, backgroundColor: 'rgba(62,42,31,0.12)' },

  // ── 한 줄 카드
  quoteCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#FFFAF3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    overflow: 'hidden',
  },
  quoteBg: {
    position: 'absolute',
    top: -8,
    left: 12,
    fontSize: 80,
    color: '#D98743',
    opacity: 0.07,
    lineHeight: 90,
  },
  quoteBody: { padding: 18, gap: 8 },
  quoteLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#C47E1A',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  quoteText: { fontSize: 14, color: '#2a2a2a', lineHeight: 23, fontStyle: 'italic' },
  quoteSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  quoteSourceBar: { width: 20, height: 1.5, backgroundColor: '#D98743' },
  quoteSource: { fontSize: 12, color: '#A67B5B', fontWeight: '600' },
  quotePlaceholder: { fontSize: 13, color: '#bbb', lineHeight: 21, fontStyle: 'italic' },

  // ── 섹션 공통
  section: { marginBottom: 16 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#3E2A1F' },
  moreBtn: { fontSize: 13, color: '#A67B5B', fontWeight: '500' },

  // ── 가로 스크롤 책 카드
  horizontalList: { paddingHorizontal: 16, gap: 14 },
  bookCard: { width: 100, gap: 6 },
  bookCardThumb: {
    width: 100,
    height: 148,
    borderRadius: 10,
    backgroundColor: '#EDE0D0',
  },
  bookCardTitle: { fontSize: 12, color: '#3E2A1F', fontWeight: '600', lineHeight: 17 },
  bookCardStars: { fontSize: 11, color: '#D98743', letterSpacing: 1 },
  bookCardAuthor: { fontSize: 11, color: '#A67B5B' },
  favRemoveBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favRemoveText: { fontSize: 11, color: '#FFD700' },

  // ── 빈 상태
  emptyHorizontal: { paddingHorizontal: 16, paddingBottom: 8 },
  emptySmallText: { fontSize: 13, color: '#bbb' },

  noImage: { justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 28 },
});