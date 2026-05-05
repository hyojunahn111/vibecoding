import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BookRecordModal from '../components/BookRecordModal';
import { getAllRecords } from '../../src/services/bookRecordStorage';

const today = new Date();
const SCREEN_W = Dimensions.get('window').width;
const CELL_W = Math.floor((SCREEN_W - 16) / 7);
const CELL_H = Math.round(CELL_W * 1.5);

// ──────────────────────────────────────────────
// 월 목록 사전 계산 (오늘 기준 ±120개월)
// ──────────────────────────────────────────────

const HALF = 120;
const TOTAL_M = HALF * 2 + 1;

const MONTH_LIST: { y: number; m: number }[] = (() => {
  const baseY = today.getFullYear();
  const baseM = today.getMonth();
  return Array.from({ length: TOTAL_M }, (_, i) => {
    const offset = i - HALF;
    let y = baseY, m = baseM + offset;
    while (m < 0) { y--; m += 12; }
    while (m > 11) { y++; m -= 12; }
    return { y, m };
  });
})();

// ──────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────
// component
// ──────────────────────────────────────────────

export default function HomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(HALF);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [datesWithRecords, setDatesWithRecords] = useState<Set<string>>(new Set());
  const [datesCompleted, setDatesCompleted] = useState<Set<string>>(new Set());
  const [dateThumbnails, setDateThumbnails] = useState<Map<string, string>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const currentIndexRef = useRef(HALF);

  const { y: year, m: month } = MONTH_LIST[currentIndex];

  const loadData = useCallback(async () => {
    const records = await getAllRecords();
    setDatesWithRecords(new Set(records.map(r => r.date)));
    const completedDates = new Set<string>();
    const thumbMap = new Map<string, string>();
    records.filter(r => r.status === 'completed').forEach(r => {
      const displayDate = r.endDate || r.date; // 종료일 우선, 없으면 등록일
      completedDates.add(displayDate);
      if (r.thumbnail) thumbMap.set(displayDate, r.thumbnail);
    });
    setDatesCompleted(completedDates);
    setDateThumbnails(thumbMap);
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const handleCloseModal = () => {
    setModalVisible(false);
    setRefreshKey(k => k + 1);
  };

  const goToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  // 페이지가 바뀔 때 헤더 월 업데이트
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      const idx = viewableItems[0].index;
      currentIndexRef.current = idx;
      setCurrentIndex(idx);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const renderItem = useCallback(({ item }: { item: { y: number; m: number } }) => {
    const { y, m } = item;
    const dInMonth = getDaysInMonth(y, m);
    const fDay = getFirstDayOfMonth(y, m);
    const cells: (number | null)[] = [
      ...Array(fDay).fill(null),
      ...Array.from({ length: dInMonth }, (_, i) => i + 1),
    ];
    const gridRows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) gridRows.push(cells.slice(i, i + 7));

    return (
      <View style={{ width: SCREEN_W, paddingHorizontal: 8 }}>
        {gridRows.map((row, rowIdx) => (
          <View key={`${y}-${m}-${rowIdx}`} style={styles.weekRow}>
            {Array.from({ length: 7 }, (_, colIdx) => {
              const day = row[colIdx] ?? null;
              const dateStr = day ? toYMD(y, m, day) : null;
              const hasRecord = dateStr ? datesWithRecords.has(dateStr) : false;
              const isCompleted = dateStr ? datesCompleted.has(dateStr) : false;
              const isT = day !== null &&
                day === today.getDate() &&
                m === today.getMonth() &&
                y === today.getFullYear();
              const thumbnail = dateStr ? (dateThumbnails.get(dateStr) ?? null) : null;

              return (
                <TouchableOpacity
                  key={colIdx}
                  style={styles.dayCell}
                  onPress={() => {
                    if (!day || !dateStr) return;
                    setSelectedDate(dateStr);
                    setModalVisible(true);
                  }}
                  disabled={!day}
                  activeOpacity={0.7}
                >
                  {day ? (
                    <View style={[
                      styles.dayInner,
                      !thumbnail && isCompleted && styles.completedInner,
                      isT && styles.todayRing,
                    ]}>
                      {thumbnail ? (
                        <Image source={{ uri: thumbnail }} style={styles.thumbImage} resizeMode="cover" />
                      ) : (
                        <>
                          <Text style={[
                            styles.dayText,
                            colIdx === 0 && styles.sunText,
                            colIdx === 6 && styles.satText,
                            isT && styles.todayText,
                            isCompleted && styles.completedText,
                          ]}>
                            {day}
                          </Text>
                          {!isCompleted && hasRecord && <View style={styles.dot} />}
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={styles.dayInner} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  }, [datesWithRecords, datesCompleted, dateThumbnails]);

  return (
    <View style={styles.container}>

      {/* ── 달력 헤더 ── */}
      <View style={styles.calHeader}>
        <TouchableOpacity
          onPress={() => goToIndex(Math.max(0, currentIndexRef.current - 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.calTitle}>{year}년 {month + 1}월</Text>
        <TouchableOpacity
          onPress={() => goToIndex(Math.min(TOTAL_M - 1, currentIndexRef.current + 1))}
          style={styles.navBtn}
        >
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── 요일 헤더 (고정) ── */}
      <View style={[styles.weekRow, styles.dayLabelRow]}>
        {DAYS.map((d, i) => (
          <Text
            key={d}
            style={[styles.dayLabel, i === 0 && styles.sunLabel, i === 6 && styles.satLabel]}
          >
            {d}
          </Text>
        ))}
      </View>

      {/* ── 슬라이드 달력 ── */}
      <FlatList
        ref={flatListRef}
        data={MONTH_LIST}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => `${item.y}-${item.m}`}
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
        initialScrollIndex={HALF}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={5}
        maxToRenderPerBatch={3}
        initialNumToRender={3}
        style={{ flex: 1 }}
      />

      <BookRecordModal
        date={selectedDate}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </View>
  );
}

// ──────────────────────────────────────────────
// styles
// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navBtn: { padding: 8 },
  navText: { fontSize: 28, color: '#4A90E2', lineHeight: 30 },
  calTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },

  dayLabelRow: { paddingHorizontal: 8, marginBottom: 2 },
  weekRow: { flexDirection: 'row', marginBottom: 3 },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    paddingVertical: 6,
  },
  sunLabel: { color: '#e05252' },
  satLabel: { color: '#4A90E2' },

  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayInner: {
    width: CELL_W - 4,
    height: CELL_H,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  todayRing: { borderWidth: 2, borderColor: '#4A90E2' },
  dayText: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  sunText: { color: '#e05252' },
  satText: { color: '#4A90E2' },
  todayText: { color: '#1862ba', fontWeight: '700' },
  completedInner: { backgroundColor: '#F5A623' },
  completedText: { color: '#1a1a1a', fontWeight: '700' },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
  },
  thumbImage: { width: '100%', height: '100%' },
});
