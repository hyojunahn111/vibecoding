import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BookRecordModal from '../components/BookRecordModal';
import { getAllRecords, getCompletedStats } from '../../src/services/bookRecordStorage';

const today = new Date();

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
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({ year: 0, month: 0, week: 0 });
  const [datesWithRecords, setDatesWithRecords] = useState<Set<string>>(new Set());
  const [datesCompleted, setDatesCompleted] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    const [s, records] = await Promise.all([
      getCompletedStats(),
      getAllRecords(),
    ]);
    setStats(s);
    setDatesWithRecords(new Set(records.map(r => r.date)));
    setDatesCompleted(new Set(records.filter(r => r.status === 'completed').map(r => r.date)));
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const handleCloseModal = () => {
    setModalVisible(false);
    setRefreshKey(k => k + 1);
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── 통계 섹션 ── */}
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

        {/* ── 달력 헤더 ── */}
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Text style={styles.navText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.calTitle}>{year}년 {month + 1}월</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Text style={styles.navText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── 달력 ── */}
        <View style={styles.calendar}>
          <View style={styles.weekRow}>
            {DAYS.map((d, i) => (
              <Text
                key={d}
                style={[
                  styles.dayLabel,
                  i === 0 && styles.sunLabel,
                  i === 6 && styles.satLabel,
                ]}
              >
                {d}
              </Text>
            ))}
          </View>

          {rows.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.weekRow}>
              {Array.from({ length: 7 }, (_, colIdx) => {
                const day = row[colIdx] ?? null;
                const dateStr = day ? toYMD(year, month, day) : null;
                const hasRecord = dateStr ? datesWithRecords.has(dateStr) : false;
                const isCompleted = dateStr ? datesCompleted.has(dateStr) : false;
                const isT = day !== null && isToday(day);

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
                    activeOpacity={0.65}
                  >
                    {day ? (
                      <View style={[
                        styles.dayInner,
                        isCompleted && styles.completedInner,
                        isT && !isCompleted && styles.todayInner,
                      ]}>
                        <Text style={[
                          styles.dayText,
                          colIdx === 0 && styles.sunText,
                          colIdx === 6 && styles.satText,
                          isT && !isCompleted && styles.todayText,
                          isCompleted && styles.completedText,
                        ]}>
                          {day}
                        </Text>
                        {!isCompleted && hasRecord && <View style={styles.dot} />}
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

        <View style={{ height: 32 }} />
      </ScrollView>

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

  // stats
  statsCard: {
    margin: 16,
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
  statCount: { fontSize: 40, fontWeight: '800', color: '#fff', lineHeight: 44 },
  statUnit: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)', paddingBottom: 4 },
  statLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 6 },
  statSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // calendar
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navBtn: { padding: 8 },
  navText: { fontSize: 28, color: '#4A90E2', lineHeight: 30 },
  calTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  calendar: { paddingHorizontal: 8 },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
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
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  dayInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayInner: { backgroundColor: '#EEF5FF', borderWidth: 1.5, borderColor: '#4A90E2', borderRadius: 19 },
  dayText: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  sunText: { color: '#e05252' },
  satText: { color: '#4A90E2' },
  todayText: { color: '#4A90E2', fontWeight: '700' },
  completedInner: {
    backgroundColor: '#F5A623',
    borderRadius: 19,
    overflow: 'hidden', // Android에서 borderRadius + background가 사각형으로 보이는 버그 방지
  },
  completedText: {
    color: '#fff',
    fontWeight: '700',
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4A90E2',
  },
});
