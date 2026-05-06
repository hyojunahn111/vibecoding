import { Stack } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import BookRecordModal from './components/BookRecordModal';
import { toHiResThumbnail } from '../src/services/api';
import { getAllRecords } from '../src/services/bookRecordStorage';
import { BookRecord } from '../src/types';

const SCREEN_W = Dimensions.get('window').width;
const GRID_ITEM_W = Math.floor((SCREEN_W - 16 - 8) / 3);
const GENRE_CARD_W = Math.floor((SCREEN_W - 24) / 2);

type SortType = 'date' | 'rating';
type TabType = 'sort' | 'genre' | 'author';

const stars = (rating: number) => {
  const r = Math.round(rating);
  return '★'.repeat(r) + '☆'.repeat(5 - r);
};

const GENRE_ACCENTS = ['#4A90E2', '#F5A623', '#2ECC71', '#9B59B6', '#E8943A', '#1ABC9C', '#E74C3C', '#8E44AD'];

function getGenreAccent(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return GENRE_ACCENTS[Math.abs(hash) % GENRE_ACCENTS.length];
}

const SPINE_PALETTE = [
  '#C0392B', '#2980B9', '#27AE60', '#D4A017',
  '#8E44AD', '#16A085', '#E67E22', '#2C3E50',
  '#E91E8C', '#1565C0', '#558B2F', '#6D4C41',
];
const SPINE_HEIGHTS = [90, 78, 94, 82, 88, 72, 86, 80];
const MAX_SPINES = 8;

function getSpineColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return SPINE_PALETTE[Math.abs(hash) % SPINE_PALETTE.length];
}

export default function CompletedBooksScreen() {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<TabType>('sort');
  const [sortType, setSortType] = useState<SortType>('date');
  const [editingRecord, setEditingRecord] = useState<BookRecord | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayTranslateY = useRef(new Animated.Value(28)).current;
  const overlayScale = useRef(new Animated.Value(0.96)).current;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const all = await getAllRecords();
        setBooks(all.filter(r => r.status === 'completed'));
      })();
    }, [])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? books.filter(b => b.title.toLowerCase().includes(q)) : books;
  }, [books, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) =>
      sortType === 'rating'
        ? b.rating - a.rating
        : (b.endDate || b.date).localeCompare(a.endDate || a.date)
    );
  }, [filtered, sortType]);

  const sections = useMemo(() => {
    const map = new Map<string, BookRecord[]>();
    for (const book of filtered) {
      const key = book.genre?.trim() || '미분류';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(book);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === '미분류') return 1;
        if (b === '미분류') return -1;
        return a.localeCompare(b, 'ko');
      })
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => (b.endDate || b.date).localeCompare(a.endDate || a.date)),
      }));
  }, [filtered]);

  const authorSections = useMemo(() => {
    const map = new Map<string, BookRecord[]>();
    for (const book of filtered) {
      const key = book.authors?.[0]?.trim() || '미분류';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(book);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === '미분류') return 1;
        if (b === '미분류') return -1;
        return a.localeCompare(b, 'ko');
      })
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => (b.endDate || b.date).localeCompare(a.endDate || a.date)),
      }));
  }, [filtered]);

  const openGenre = (genre: string) => {
    setSelectedGenre(genre);
    overlayOpacity.setValue(0);
    overlayTranslateY.setValue(28);
    overlayScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(overlayTranslateY, { toValue: 0, tension: 72, friction: 12, useNativeDriver: true }),
      Animated.spring(overlayScale, { toValue: 1, tension: 72, friction: 12, useNativeDriver: true }),
    ]).start();
  };

  const closeGenre = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayTranslateY, { toValue: 16, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayScale, { toValue: 0.96, duration: 200, useNativeDriver: true }),
    ]).start(() => setSelectedGenre(null));
  };

  const renderGridBook = (item: BookRecord) => (
    <TouchableOpacity style={styles.gridItem} onPress={() => setEditingRecord(item)} activeOpacity={0.7}>
      {item.thumbnail ? (
        <Image source={{ uri: toHiResThumbnail(item.thumbnail) }} style={styles.gridImage} resizeMode="cover" />
      ) : (
        <View style={[styles.gridImage, styles.gridNoImage]}>
          <Text style={styles.gridNoImageText}>📚</Text>
        </View>
      )}
      <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.gridStars}>{stars(item.rating)}</Text>
    </TouchableOpacity>
  );

  const renderBook = (item: BookRecord) => (
    <TouchableOpacity style={styles.bookItem} onPress={() => setEditingRecord(item)} activeOpacity={0.7}>
      {item.thumbnail ? (
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.noImage]}>
          <Text style={styles.noImageText}>📚</Text>
        </View>
      )}
      <View style={styles.bookInfo}>
        <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.bookAuthor} numberOfLines={1}>{item.authors?.join(', ')}</Text>
        <Text style={styles.starsText}>{stars(item.rating)}</Text>
        {item.endDate ? <Text style={styles.dateText}>완독 {item.endDate}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  const renderGenreCard = ({ item }: { item: { title: string; data: BookRecord[] } }) => {
    const accentColor = getGenreAccent(item.title);
    const hasOverflow = item.data.length > MAX_SPINES;
    const booksToShow = item.data.slice(0, hasOverflow ? MAX_SPINES - 1 : MAX_SPINES);
    const overflow = item.data.length - booksToShow.length;

    return (
      <TouchableOpacity style={styles.genreCard} onPress={() => openGenre(item.title)} activeOpacity={0.82}>
        {/* 상단 판자 */}
        <View style={styles.shelfTopBoard} />

        {/* 책장 칸 */}
        <View style={styles.shelfFrame}>
          <View style={styles.shelfSidePanel}>
            <View style={styles.shelfSideEdge} />
          </View>

          <View style={styles.shelfInterior}>
            {/* 내부 상단 음영 */}
            <View style={styles.shelfInnerShadow} />

            {booksToShow.length > 0 ? (
              <View style={styles.shelfBooksRow}>
                {booksToShow.map((book, i) => {
                  const color = getSpineColor(book.title);
                  const h = SPINE_HEIGHTS[i % SPINE_HEIGHTS.length];
                  return (
                    <View key={book.id} style={[styles.bookSpine, { height: h, backgroundColor: color }]}>
                      {/* 상단 색 띠 */}
                      <View style={styles.spineTopBand} />
                      {/* 중앙 라벨 */}
                      <View style={styles.spineLabel} />
                    </View>
                  );
                })}
                {hasOverflow && (
                  <View style={[styles.bookSpine, styles.bookSpineMore, { height: 78 }]}>
                    <Text style={styles.bookSpineMoreText}>+{overflow}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.shelfEmptyBooks}>
                <Text style={styles.shelfEmptyEmoji}>📚</Text>
              </View>
            )}

            {/* 바닥 선반 */}
            <View style={styles.shelfFloor}>
              <View style={styles.shelfFloorHighlight} />
            </View>
          </View>

          <View style={[styles.shelfSidePanel, { alignItems: 'flex-end' }]}>
            <View style={styles.shelfSideEdge} />
          </View>
        </View>

        {/* 장르 정보 */}
        <View style={[styles.genreCardBottom, { borderTopColor: accentColor + '44' }]}>
          <Text style={styles.genreCardName} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.genreCardBadge, { backgroundColor: accentColor }]}>
            <Text style={styles.genreCardBadgeText}>{item.data.length}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const empty = (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>완독한 책이 없습니다</Text>
    </View>
  );

  const selectedSection = sections.find(s => s.title === selectedGenre);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: '완독한 책', headerBackTitle: '마이페이지' }} />

      {/* 탭 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'sort' && styles.tabActive]}
          onPress={() => setTab('sort')}
        >
          <Text style={[styles.tabText, tab === 'sort' && styles.tabTextActive]}>정렬</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'genre' && styles.tabActive]}
          onPress={() => setTab('genre')}
        >
          <Text style={[styles.tabText, tab === 'genre' && styles.tabTextActive]}>분야별</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'author' && styles.tabActive]}
          onPress={() => setTab('author')}
        >
          <Text style={[styles.tabText, tab === 'author' && styles.tabTextActive]}>저자별</Text>
        </TouchableOpacity>
      </View>

      {/* 검색 */}
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

      {/* 정렬 탭 */}
      {tab === 'sort' && (
        <>
          <View style={styles.sortRow}>
            <TouchableOpacity
              style={[styles.sortBtn, sortType === 'date' && styles.sortBtnActive]}
              onPress={() => setSortType('date')}
            >
              <Text style={[styles.sortBtnText, sortType === 'date' && styles.sortBtnTextActive]}>날짜 순</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortBtn, sortType === 'rating' && styles.sortBtnActive]}
              onPress={() => setSortType('rating')}
            >
              <Text style={[styles.sortBtnText, sortType === 'rating' && styles.sortBtnTextActive]}>별점 순</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={sorted}
            keyExtractor={item => item.id}
            renderItem={({ item }) => renderGridBook(item)}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[{ paddingHorizontal: 8, paddingTop: 8 }, sorted.length === 0 && styles.emptyContainer]}
            ListEmptyComponent={empty}
          />
        </>
      )}

      {/* 분야별 탭 — 카드 그리드 */}
      {tab === 'genre' && (
        <FlatList
          data={sections}
          keyExtractor={item => item.title}
          renderItem={renderGenreCard}
          numColumns={2}
          columnWrapperStyle={styles.genreRow}
          contentContainerStyle={[{ padding: 8 }, sections.length === 0 && styles.emptyContainer]}
          ListEmptyComponent={empty}
        />
      )}

      {/* 작가별 탭 */}
      {tab === 'author' && (
        <SectionList
          sections={authorSections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => renderBook(item)}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}권</Text>
            </View>
          )}
          ListEmptyComponent={empty}
          contentContainerStyle={authorSections.length === 0 && styles.emptyContainer}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* 분야 상세 오버레이 */}
      {selectedGenre !== null && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.genreOverlay,
            {
              opacity: overlayOpacity,
              transform: [{ translateY: overlayTranslateY }, { scale: overlayScale }],
            },
          ]}
        >
          <View style={styles.genreOverlayHeader}>
            <TouchableOpacity onPress={closeGenre} style={styles.genreBackBtn}>
              <Text style={styles.genreBackText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.genreOverlayTitle}>{selectedGenre}</Text>
            <Text style={styles.genreOverlayCount}>{selectedSection?.data.length ?? 0}권</Text>
          </View>
          <FlatList
            data={selectedSection?.data ?? []}
            keyExtractor={item => item.id}
            renderItem={({ item }) => renderBook(item)}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </Animated.View>
      )}

      <BookRecordModal
        date={editingRecord?.date ?? null}
        visible={editingRecord !== null}
        initialRecord={editingRecord ?? undefined}
        onClose={() => {
          setEditingRecord(null);
          getAllRecords().then(all => setBooks(all.filter(r => r.status === 'completed')));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // 검색
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

  // 탭
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginTop: 8,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#4A90E2' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#aaa' },
  tabTextActive: { color: '#4A90E2', fontWeight: '700' },

  // 정렬 버튼
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sortBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  sortBtnActive: { backgroundColor: '#4A90E2', borderColor: '#4A90E2' },
  sortBtnText: { fontSize: 13, color: '#666' },
  sortBtnTextActive: { color: '#fff', fontWeight: '600' },

  // 정렬 탭 그리드
  gridRow: { gap: 4, marginBottom: 4 },
  gridItem: { width: GRID_ITEM_W, marginBottom: 8 },
  gridImage: {
    width: GRID_ITEM_W,
    height: Math.round(GRID_ITEM_W * 1.5),
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  gridNoImage: { justifyContent: 'center', alignItems: 'center' },
  gridNoImageText: { fontSize: 28 },
  gridTitle: { fontSize: 11, fontWeight: '600', color: '#1a1a1a', marginTop: 5, lineHeight: 15 },
  gridStars: { fontSize: 10, color: '#F5A623', marginTop: 2, letterSpacing: 0.5 },

  // 분야별 카드 그리드
  genreRow: { gap: 8, marginBottom: 8 },
  genreCard: {
    width: GENRE_CARD_W,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#7D5230',
    shadowColor: '#4a2e10',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },

  // 책장 구조
  shelfTopBoard: {
    height: 9,
    backgroundColor: '#6B4220',
    borderBottomWidth: 2,
    borderBottomColor: '#A0662E',
  },
  shelfFrame: {
    flexDirection: 'row',
  },
  shelfSidePanel: {
    width: 11,
    backgroundColor: '#7D5230',
    justifyContent: 'flex-start',
  },
  shelfSideEdge: {
    width: 3,
    flex: 1,
    backgroundColor: '#A0672F',
  },
  shelfInterior: {
    flex: 1,
    justifyContent: 'flex-end',
    minHeight: 136,
    backgroundColor: '#DDD0BE',
  },
  shelfInnerShadow: {
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  shelfBooksRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    paddingHorizontal: 4,
    gap: 2,
  },
  bookSpine: {
    width: 17,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    overflow: 'hidden',
    justifyContent: 'space-between',
    // 우측 얇은 그림자 선
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.18)',
  },
  spineTopBand: {
    height: 11,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  spineLabel: {
    width: 11,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.40)',
    borderRadius: 1,
    alignSelf: 'center',
    marginVertical: 4,
  },

  bookSpineMore: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0,
  },
  bookSpineMoreText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  shelfEmptyBooks: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shelfEmptyEmoji: { fontSize: 26 },
  shelfFloor: {
    height: 13,
    backgroundColor: '#6B4220',
  },
  shelfFloorHighlight: {
    height: 3,
    backgroundColor: '#A0672F',
  },

  genreCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    backgroundColor: '#fff',
  },
  genreCardName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 6 },
  genreCardBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  genreCardBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // 분야 상세 오버레이
  genreOverlay: {
    backgroundColor: '#fff',
    zIndex: 20,
  },
  genreOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 4,
  },
  genreBackBtn: { padding: 12 },
  genreBackText: { fontSize: 30, color: '#4A90E2', lineHeight: 34 },
  genreOverlayTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  genreOverlayCount: { fontSize: 13, color: '#888' },

  // 책 카드 (작가별/분야 상세용)
  bookItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
    alignItems: 'flex-start',
  },
  thumbnail: { width: 56, height: 80, borderRadius: 4 },
  noImage: { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 22 },
  bookInfo: { flex: 1, gap: 4 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', lineHeight: 20 },
  bookAuthor: { fontSize: 12, color: '#666' },
  starsText: { fontSize: 13, color: '#F5A623', letterSpacing: 1 },
  dateText: { fontSize: 11, color: '#aaa' },

  // 작가별 섹션 헤더
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8f9fb',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeaderText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  sectionCount: { fontSize: 12, color: '#888' },

  // 빈 상태
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#aaa' },
});
