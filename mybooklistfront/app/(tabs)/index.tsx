import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function HomeScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(today.getDate());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) {
      setYear(y => y - 1);
      setMonth(11);
    } else {
      setMonth(m => m - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setYear(y => y + 1);
      setMonth(0);
    } else {
      setMonth(m => m + 1);
    }
    setSelectedDate(null);
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {year}년 {month + 1}월
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navText}>{'›'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.calendar}>
        <View style={styles.weekRow}>
          {DAYS.map((d, i) => (
            <Text
              key={d}
              style={[
                styles.dayLabel,
                i === 0 && styles.sundayLabel,
                i === 6 && styles.saturdayLabel,
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
              const selected = day !== null && day === selectedDate;
              const todayCell = day !== null && isToday(day);
              return (
                <TouchableOpacity
                  key={colIdx}
                  style={styles.dayCell}
                  onPress={() => day && setSelectedDate(day)}
                  disabled={!day}
                  activeOpacity={0.7}
                >
                  {day ? (
                    <View style={[
                      styles.dayInner,
                      selected && styles.selectedInner,
                      todayCell && !selected && styles.todayInner,
                    ]}>
                      <Text style={[
                        styles.dayText,
                        colIdx === 0 && styles.sundayText,
                        colIdx === 6 && styles.saturdayText,
                        selected && styles.selectedText,
                        todayCell && !selected && styles.todayText,
                      ]}>
                        {day}
                      </Text>
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

      {selectedDate && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedInfoText}>
            {year}년 {month + 1}월 {selectedDate}일
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  navBtn: { padding: 8 },
  navText: { fontSize: 28, color: '#4A90E2', lineHeight: 30 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  calendar: { width: '100%' },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    paddingVertical: 8,
  },
  sundayLabel: { color: '#e05252' },
  saturdayLabel: { color: '#4A90E2' },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayInner: {
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  selectedInner: {
    backgroundColor: '#4A90E2',
  },
  dayText: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  sundayText: { color: '#e05252' },
  saturdayText: { color: '#4A90E2' },
  todayText: { color: '#4A90E2', fontWeight: '700' },
  selectedText: { color: '#fff', fontWeight: '700' },
  selectedInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f6ff',
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedInfoText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
});
