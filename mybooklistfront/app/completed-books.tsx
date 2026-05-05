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

const GENRE_PALETTES: [string, string][] = [
  ['#EEF4FF', '#4A90E2'],
  ['#FFF3EE', '#F5A623'],
  ['#F0FFF6', '#2ECC71'],
  ['#FDF4FF', '#9B59B6'],
  ['#FFF8EE', '#E8943A'],
  ['#EEFFF8', '#1ABC9C'],
  ['#FFF0F0', '#E74C3C'],
  ['#F4F0FF', '#8E44AD'],
];

function getGenrePalette(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = title.charCodeAt(i) + ((hash << 5) - hash);
  return GENRE_PALETTES[Math.abs(hash) % GENRE_PALETTES.length];
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
    const [bgColor, accentColor] = getGenrePalette(item.title);
    const thumbs = item.data.filter(b => b.thumbnail).slice(0, 3).map(b => b.thumbnail!);
    const rotations = [-7, 2, -4];
    const translateXs = [-20, 0, 20];
    const translateYs = [6, 0, 8];

    return (
      <TouchableOpacity
        style={[styles.genreCard, { backgroundColor: bgColor }]}
        onPress={() => openGenre(item.title)}
        activeOpacity={0.82}
      >
        <View style={styles.genreThumbArea}>
          {thumbs.length > 0 ? (
            thumbs.map((uri, i) => (
              <Image
                key={i}
                source={{ uri: toHiResThumbnail(uri) }}
                style={[
                  styles.genreThumbImg,
                  {
                    transform: [
                      { rotate: `${rotations[i]}deg` },
                      { translateX: translateXs[i] },
                      { translateY: translateYs[i] },
                    ],
                    zIndex: thumbs.length - i,
                  },
                ]}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={[styles.genreEmptyThumb, { backgroundColor: accentColor + '22' }]}>
              <Text style={styles.genreEmptyEmoji}>📚</Text>
            </View>
          )}
        </View>

        <View style={[styles.genreCardBottom, { borderTopColor: accentColor + '33' }]}>
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
          <Text style={[styles.tabText, tab === 'author' && styles.tabTextActive]}>작가별</Text>
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
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  genreThumbArea: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  genreThumbImg: {
    position: 'absolute',
    width: 54,
    height: 76,
    borderRadius: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  genreEmptyThumb: {
    width: 64,
    height: 80,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreEmptyEmoji: { fontSize: 32 },
  genreCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
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
