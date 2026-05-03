import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { bookApi } from '../../src/services/api';
import {
  deleteRecord,
  getAllRecords,
  saveRecord,
} from '../../src/services/bookRecordStorage';
import { Book, BookRecord, ReadingStatus } from '../../src/types';
import CalendarDatePicker from './CalendarDatePicker';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// ──────────────────────────────────────────────
// helpers
// ──────────────────────────────────────────────

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function dateLabel(date: string): string {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  // toISOString()은 UTC 기준이라 UTC+9 환경에서 날짜가 밀림 → 로컬 시간 직접 포맷
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const STATUS_LABELS: Record<ReadingStatus, string> = {
  unread: '미독',
  reading: '읽는중',
  completed: '완독',
};

// ──────────────────────────────────────────────
// sub-component: inline book search
// ──────────────────────────────────────────────

function BookSearchView({ onSelect, onCancel }: {
  onSelect: (book: Book) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) { setBooks([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await bookApi.search(query, 1, 20);
        setBooks(res.documents);
      } catch {
        setBooks([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  return (
    <View style={{ flex: 1 }}>
      <View style={ss.searchHeader}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={ss.backBtnText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={ss.searchTitle}>책 검색</Text>
      </View>
      <View style={ss.searchBarRow}>
        <TextInput
          style={ss.searchInput}
          placeholder="책 제목, 저자 검색"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        {loading && <ActivityIndicator style={{ marginLeft: 8 }} color="#4A90E2" />}
      </View>
      <FlatList
        data={books}
        keyExtractor={(b, i) => `${b.isbn}-${i}`}
        renderItem={({ item }) => (
          <TouchableOpacity style={ss.bookRow} onPress={() => onSelect(item)}>
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={ss.thumb} />
            ) : (
              <View style={[ss.thumb, ss.noThumb]}>
                <Text style={{ fontSize: 18 }}>📚</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={ss.bookTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={ss.bookSub} numberOfLines={1}>
                {item.authors.join(', ')} · {item.publisher}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && query.trim() ? (
            <Text style={ss.emptyText}>검색 결과가 없습니다</Text>
          ) : null
        }
      />
    </View>
  );
}

// ──────────────────────────────────────────────
// sub-component: star rating
// ──────────────────────────────────────────────

function StarRating({ value, onChange, disabled }: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <View style={ss.starRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity
          key={n}
          onPress={() => !disabled && onChange(value === n ? 0 : n)}
          disabled={disabled}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={[ss.star, disabled && ss.starDisabled]}>
            {n <= value ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
      <Text style={[ss.ratingNum, disabled && ss.starDisabled]}>
        {value > 0 ? ` ${value}점` : ' -'}
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────
// sub-component: record form
// ──────────────────────────────────────────────

function RecordForm({ date, initial, onSave, onCancel }: {
  date: string;
  initial?: BookRecord;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [view, setView] = useState<'form' | 'search'>('form');
  const [isbn, setIsbn] = useState(initial?.isbn ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [authors, setAuthors] = useState<string[]>(initial?.authors ?? []);
  const [thumbnail, setThumbnail] = useState(initial?.thumbnail ?? '');
  const [publisher, setPublisher] = useState(initial?.publisher ?? '');
  const [genre, setGenre] = useState(initial?.genre ?? '');
  const [status, setStatus] = useState<ReadingStatus>(initial?.status ?? 'unread');
  const [isCompleted, setIsCompleted] = useState(initial?.isCompleted ?? false);
  const [startDate, setStartDate] = useState(initial?.startDate ?? date);
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [excerpts, setExcerpts] = useState<string[]>(
    initial?.excerpts?.length ? initial.excerpts : ['']
  );
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSelectBook = (book: Book) => {
    setIsbn(book.isbn);
    setTitle(book.title);
    setAuthors(book.authors);
    setThumbnail(book.thumbnail);
    setPublisher(book.publisher);
    setView('form');
  };

  const handleStatusChange = (s: ReadingStatus) => {
    setStatus(s);
    if (s === 'completed') {
      setIsCompleted(true);
    } else {
      setIsCompleted(false);
      setEndDate('');
      setRating(0);
    }
  };

  const handleCompletedToggle = () => {
    const next = !isCompleted;
    setIsCompleted(next);
    if (next) {
      setStatus('completed');
    } else {
      if (status === 'completed') setStatus('reading');
      setEndDate('');
      setRating(0);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '책을 선택해주세요.');
      return;
    }
    await saveRecord({
      id: initial?.id ?? newId(),
      date,
      isbn,
      title,
      authors,
      thumbnail,
      publisher,
      genre,
      status,
      isCompleted,
      startDate,
      endDate: isCompleted ? endDate : '',
      rating: isCompleted ? rating : 0,
      excerpts: excerpts.filter(e => e.trim()),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
    onSave();
  };

  if (view === 'search') {
    return (
      <BookSearchView
        onSelect={handleSelectBook}
        onCancel={() => setView('form')}
      />
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
      {/* 책 선택 */}
      <View style={ss.section}>
        <Text style={ss.label}>책</Text>
        {title ? (
          <TouchableOpacity style={ss.bookCard} onPress={() => setView('search')}>
            {thumbnail ? (
              <Image source={{ uri: thumbnail }} style={ss.cardThumb} />
            ) : (
              <View style={[ss.cardThumb, ss.noThumb]}>
                <Text style={{ fontSize: 22 }}>📚</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={ss.cardTitle} numberOfLines={2}>{title}</Text>
              <Text style={ss.cardSub} numberOfLines={1}>
                {authors.join(', ')} · {publisher}
              </Text>
            </View>
            <Text style={ss.changeText}>변경</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={ss.selectBtn} onPress={() => setView('search')}>
            <Text style={ss.selectBtnText}>📖 책 선택하기</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 상태 */}
      <View style={ss.section}>
        <Text style={ss.label}>상태</Text>
        <View style={ss.statusRow}>
          {(['unread', 'reading', 'completed'] as ReadingStatus[]).map(s => (
            <TouchableOpacity
              key={s}
              style={[ss.statusBtn, status === s && ss.statusBtnActive]}
              onPress={() => handleStatusChange(s)}
            >
              <Text style={[ss.statusBtnText, status === s && ss.statusBtnTextActive]}>
                {STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 다 읽음 여부 */}
      <View style={ss.section}>
        <Text style={ss.label}>다 읽음</Text>
        <TouchableOpacity style={ss.toggleRow} onPress={handleCompletedToggle}>
          <View style={[ss.toggle, isCompleted && ss.toggleOn]}>
            <View style={[ss.toggleThumb, isCompleted && ss.toggleThumbOn]} />
          </View>
          <Text style={ss.toggleLabel}>{isCompleted ? '완독했어요' : '아직 읽는 중'}</Text>
        </TouchableOpacity>
      </View>

      {/* 독서 시작 날짜 */}
      <View style={ss.section}>
        <Text style={ss.label}>독서 시작 날짜</Text>
        <TouchableOpacity style={ss.dateBtn} onPress={() => setShowStartPicker(true)}>
          <Text style={[ss.dateBtnText, !startDate && ss.datePlaceholder]}>
            {startDate || '날짜를 선택하세요'}
          </Text>
          <Text style={ss.calIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      {/* 독서 종료 날짜 */}
      {isCompleted && (
        <View style={ss.section}>
          <Text style={ss.label}>독서 종료 날짜</Text>
          <TouchableOpacity style={ss.dateBtn} onPress={() => setShowEndPicker(true)}>
            <Text style={[ss.dateBtnText, !endDate && ss.datePlaceholder]}>
              {endDate || '날짜를 선택하세요'}
            </Text>
            <Text style={ss.calIcon}>📅</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 별점 */}
      <View style={ss.section}>
        <Text style={[ss.label, !isCompleted && ss.labelDisabled]}>
          별점{!isCompleted ? ' (완독 후 입력)' : ''}
        </Text>
        <StarRating value={rating} onChange={setRating} disabled={!isCompleted} />
      </View>

      {/* 분야 */}
      <View style={ss.section}>
        <Text style={ss.label}>분야</Text>
        <TextInput
          style={ss.textInput}
          value={genre}
          onChangeText={setGenre}
          placeholder="예) 소설, 자기계발, 과학..."
        />
      </View>

      {/* 발췌 구절 */}
      <View style={ss.section}>
        <Text style={ss.label}>발췌 구절</Text>
        {excerpts.map((excerpt, idx) => (
          <View key={idx} style={ss.excerptRow}>
            <TextInput
              style={[ss.textInput, ss.excerptInput]}
              value={excerpt}
              onChangeText={text => {
                const next = [...excerpts];
                next[idx] = text;
                setExcerpts(next);
              }}
              placeholder="인상깊은 구절을 입력하세요..."
              multiline
            />
            {excerpts.length > 1 && (
              <TouchableOpacity
                style={ss.excerptRemoveBtn}
                onPress={() => setExcerpts(excerpts.filter((_, i) => i !== idx))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={ss.excerptRemoveText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        <TouchableOpacity
          style={ss.excerptAddBtn}
          onPress={() => setExcerpts([...excerpts, ''])}
        >
          <Text style={ss.excerptAddText}>+ 구절 추가</Text>
        </TouchableOpacity>
      </View>

      {/* 버튼 */}
      <View style={ss.btnRow}>
        <TouchableOpacity style={ss.cancelBtn} onPress={onCancel}>
          <Text style={ss.cancelBtnText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ss.saveBtn} onPress={handleSave}>
          <Text style={ss.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />

      <CalendarDatePicker
        visible={showStartPicker}
        value={startDate}
        onConfirm={d => setStartDate(d)}
        onClose={() => setShowStartPicker(false)}
      />
      <CalendarDatePicker
        visible={showEndPicker}
        value={endDate}
        onConfirm={d => setEndDate(d)}
        onClose={() => setShowEndPicker(false)}
        minDate={startDate}
      />
    </ScrollView>
  );
}

// ──────────────────────────────────────────────
// sub-component: record list (single date page)
// ──────────────────────────────────────────────

function RecordList({ records, onAdd, onEdit, onDelete }: {
  records: BookRecord[];
  onAdd: () => void;
  onEdit: (r: BookRecord) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={ss.listContent}>
      <TouchableOpacity style={ss.addBtn} onPress={onAdd}>
        <Text style={ss.addBtnText}>+ 기록 추가</Text>
      </TouchableOpacity>

      {records.length === 0 ? (
        <View style={ss.emptyState}>
          <Text style={ss.emptyStateText}>📖</Text>
          <Text style={ss.emptyStateLabel}>아직 기록이 없어요</Text>
          <Text style={ss.emptyStateSub}>오늘 읽은 책을 기록해보세요!</Text>
        </View>
      ) : (
        records.map(r => (
          <View key={r.id} style={ss.recordCard}>
            <TouchableOpacity style={ss.recordCardInner} onPress={() => onEdit(r)}>
              {r.thumbnail ? (
                <Image source={{ uri: r.thumbnail }} style={ss.recordThumb} />
              ) : (
                <View style={[ss.recordThumb, ss.noThumb]}>
                  <Text style={{ fontSize: 20 }}>📚</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={ss.recordTitle} numberOfLines={2}>{r.title}</Text>
                <Text style={ss.recordMeta} numberOfLines={1}>{r.authors.join(', ')}</Text>
                <View style={ss.recordTagRow}>
                  <View style={[ss.statusTag, ss[`status_${r.status}` as keyof typeof ss] as any]}>
                    <Text style={ss.statusTagText}>{STATUS_LABELS[r.status]}</Text>
                  </View>
                  {r.genre ? (
                    <View style={ss.genreTag}>
                      <Text style={ss.genreTagText}>{r.genre}</Text>
                    </View>
                  ) : null}
                </View>
                {r.isCompleted && r.rating > 0 && (
                  <Text style={ss.recordRating}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.rating}점
                  </Text>
                )}
                <Text style={ss.recordDates}>
                  {r.startDate}{r.isCompleted && r.endDate ? ` → ${r.endDate}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={ss.deleteBtn}
              onPress={() => Alert.alert('삭제', '이 기록을 삭제할까요?', [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: () => onDelete(r.id) },
              ])}
            >
              <Text style={ss.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ──────────────────────────────────────────────
// main export
// ──────────────────────────────────────────────

// ±365일 범위의 날짜 배열 (총 731개)
const HALF = 365;
const TOTAL = HALF * 2 + 1;

function buildDates(centerDate: string): string[] {
  return Array.from({ length: TOTAL }, (_, i) => addDays(centerDate, i - HALF));
}

export default function BookRecordModal({ date, visible, onClose, initialRecord }: {
  date: string | null;
  visible: boolean;
  onClose: () => void;
  initialRecord?: BookRecord;
}) {
  const [currentDate, setCurrentDate] = useState(date ?? '');
  const [allRecords, setAllRecords] = useState<BookRecord[]>([]);
  const [view, setView] = useState<'pager' | 'form'>('pager');
  const [editing, setEditing] = useState<BookRecord | undefined>(undefined);
  const [formDate, setFormDate] = useState('');
  const [dates, setDates] = useState<string[]>([]);
  const flatListRef = useRef<FlatList<string>>(null);
  const currentIndexRef = useRef(HALF);
  const translateY = useRef(new Animated.Value(0)).current;
  const dragActive = useRef(new Animated.Value(0)).current;
  const handleColor = dragActive.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ccc', '#4A90E2'],
  });

  const swipePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragActive.setValue(1);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        dragActive.setValue(0);
        if (gs.dy > 120 || gs.vy > 0.8) {
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        dragActive.setValue(0);
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (!visible || !date) return;
    translateY.setValue(SCREEN_HEIGHT);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    setCurrentDate(date);
    loadAll();
    if (initialRecord) {
      setEditing(initialRecord);
      setFormDate(initialRecord.date);
      setView('form');
    } else {
      setView('pager');
      setEditing(undefined);
      setDates(buildDates(date));
      currentIndexRef.current = HALF;
    }
  }, [visible, date]);

  const loadAll = async () => {
    setAllRecords(await getAllRecords());
  };

  const recordsFor = (d: string) => allRecords.filter(r => r.date === d);

  // FlatList가 어떤 항목을 보여주는지 감지 → 헤더 날짜 업데이트
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      currentIndexRef.current = viewableItems[0].index;
      setCurrentDate(viewableItems[0].item);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // 헤더 화살표
  const goToPrev = () => {
    const idx = Math.max(0, currentIndexRef.current - 1);
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  };
  const goToNext = () => {
    const idx = Math.min(TOTAL - 1, currentIndexRef.current + 1);
    flatListRef.current?.scrollToIndex({ index: idx, animated: true });
  };

  const handleAdd = (d: string) => {
    setFormDate(d);
    setEditing(undefined);
    setView('form');
  };

  const handleEdit = (r: BookRecord) => {
    setFormDate(r.date);
    setEditing(r);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    await deleteRecord(id);
    loadAll();
  };

  const handleSaved = () => {
    loadAll();
    if (initialRecord) {
      onClose();
    } else {
      setView('pager');
      setEditing(undefined);
    }
  };

  if (!date) return null;

  const safeDate = currentDate || date;

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={ss.modalOverlay} onStartShouldSetResponder={() => true}>
      <Animated.View style={[ss.modal, { transform: [{ translateY }] }]}>

        {/* ── 드래그 핸들 (스와이프 전용 영역) ── */}
        <View style={ss.dragHandleArea} {...swipePan.panHandlers}>
          <Animated.View style={[ss.dragHandle, { backgroundColor: handleColor }]} />
        </View>

        {/* ── 헤더 ── */}
        <View style={ss.modalHeader}>
          {view === 'form' ? (
            <>
              <TouchableOpacity onPress={() => { setView('pager'); setEditing(undefined); }}>
                <Text style={ss.headerSide}>← 목록</Text>
              </TouchableOpacity>
              <Text style={ss.modalTitle}>
                {editing ? '기록 수정' : '기록 추가'}
              </Text>
              <View style={ss.headerSidePlaceholder} />
            </>
          ) : (
            <>
              <TouchableOpacity onPress={onClose}>
                <Text style={ss.headerSide}>✕ 닫기</Text>
              </TouchableOpacity>
              <View style={ss.datePager}>
                <TouchableOpacity onPress={goToPrev} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={ss.dateArrow}>‹</Text>
                </TouchableOpacity>
                <Text style={ss.modalTitle}>{dateLabel(safeDate)}</Text>
                <TouchableOpacity onPress={goToNext} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={ss.dateArrow}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={ss.headerSidePlaceholder} />
            </>
          )}
        </View>

        {/* ── 컨텐츠 ── */}
        {view === 'pager' ? (
          <FlatList
            ref={flatListRef}
            key={`flatlist-${date}`}
            data={dates}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item}
            renderItem={({ item: d }) => (
              <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <RecordList
                  records={recordsFor(d)}
                  onAdd={() => handleAdd(d)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </View>
            )}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            initialScrollIndex={HALF}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            style={{ flex: 1 }}
          />
        ) : (
          <RecordForm
            key={editing?.id ?? formDate}
            date={formDate}
            initial={editing}
            onSave={handleSaved}
            onCancel={() => { if (initialRecord) { onClose(); } else { setView('pager'); setEditing(undefined); } }}
          />
        )}

      </Animated.View>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────
// styles
// ──────────────────────────────────────────────

const ss = StyleSheet.create({
  modalOverlay: { flex: 1 },
  modal: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },

  dragHandleArea: { alignItems: 'center', paddingVertical: 12 },
  dragHandle: { width: 40, height: 5, borderRadius: 3 },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerSide: { fontSize: 15, color: '#888', width: 60 },
  headerSidePlaceholder: { width: 60 },
  datePager: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateArrow: { fontSize: 24, color: '#4A90E2', lineHeight: 26 },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  // list
  listContent: { padding: 14, gap: 10 },
  addBtn: {
    backgroundColor: '#4A90E2',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyStateText: { fontSize: 48, marginBottom: 12 },
  emptyStateLabel: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 6 },
  emptyStateSub: { fontSize: 14, color: '#aaa' },

  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  recordCardInner: { flex: 1, flexDirection: 'row', padding: 12, gap: 12 },
  recordThumb: { width: 52, height: 74, borderRadius: 4 },
  noThumb: { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  recordTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 3 },
  recordMeta: { fontSize: 12, color: '#888', marginBottom: 6 },
  recordTagRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  status_unread: { backgroundColor: '#f0f0f0' },
  status_reading: { backgroundColor: '#FFF3CD' },
  status_completed: { backgroundColor: '#D4EDDA' },
  statusTagText: { fontSize: 11, fontWeight: '600', color: '#444' },
  genreTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, backgroundColor: '#E8F0FE' },
  genreTagText: { fontSize: 11, color: '#4A90E2' },
  recordRating: { fontSize: 12, color: '#F5A623', marginBottom: 3 },
  recordDates: { fontSize: 11, color: '#aaa' },
  deleteBtn: { padding: 14 },
  deleteBtnText: { fontSize: 18 },

  // form
  section: { paddingHorizontal: 16, paddingTop: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelDisabled: { color: '#bbb' },

  selectBtn: {
    borderWidth: 1.5,
    borderColor: '#4A90E2',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  selectBtnText: { color: '#4A90E2', fontWeight: '600', fontSize: 15 },

  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    backgroundColor: '#fafafa',
  },
  cardThumb: { width: 44, height: 62, borderRadius: 4 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 3 },
  cardSub: { fontSize: 12, color: '#888' },
  changeText: { fontSize: 12, color: '#4A90E2', fontWeight: '600' },

  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center',
  },
  statusBtnActive: { borderColor: '#4A90E2', backgroundColor: '#EEF5FF' },
  statusBtnText: { fontSize: 14, fontWeight: '600', color: '#999' },
  statusBtnTextActive: { color: '#4A90E2' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggle: {
    width: 48, height: 28, borderRadius: 14,
    backgroundColor: '#ddd', padding: 3, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: '#4A90E2' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleLabel: { fontSize: 15, color: '#444', fontWeight: '500' },

  dateBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  dateBtnText: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  datePlaceholder: { color: '#bbb' },
  calIcon: { fontSize: 20 },

  textInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1a1a1a',
  },

  excerptRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  excerptInput: { flex: 1, minHeight: 44 },
  excerptRemoveBtn: { paddingTop: 12 },
  excerptRemoveText: { fontSize: 14, color: '#aaa' },
  excerptAddBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#4A90E2', marginTop: 2,
  },
  excerptAddText: { fontSize: 13, color: '#4A90E2', fontWeight: '600' },

  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  star: { fontSize: 28, color: '#F5A623' },
  starDisabled: { color: '#ddd' },
  ratingNum: { fontSize: 14, color: '#F5A623', marginLeft: 4, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 28 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#888' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: '#4A90E2', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // book search
  searchHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 12,
  },
  backBtnText: { fontSize: 15, color: '#4A90E2', fontWeight: '600' },
  searchTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  searchBarRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  bookRow: {
    flexDirection: 'row', padding: 12, gap: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center',
  },
  thumb: { width: 48, height: 68, borderRadius: 4 },
  bookTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  bookSub: { fontSize: 12, color: '#888' },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 40 },
});
