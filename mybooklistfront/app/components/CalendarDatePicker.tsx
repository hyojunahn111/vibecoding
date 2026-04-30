import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

function parseDate(dateStr: string): { y: number; m: number; d: number } | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m: m - 1, d };
}

interface Props {
  visible: boolean;
  value: string;        // YYYY-MM-DD
  onConfirm: (date: string) => void;
  onClose: () => void;
  minDate?: string;     // YYYY-MM-DD, 이 날짜 이전은 선택 불가
}

export default function CalendarDatePicker({ visible, value, onConfirm, onClose, minDate }: Props) {
  const today = new Date();
  const parsed = parseDate(value);

  const [year, setYear] = useState(parsed?.y ?? today.getFullYear());
  const [month, setMonth] = useState(parsed?.m ?? today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(parsed?.d ?? null);

  // 외부 value가 바뀌면 내부 상태도 동기화
  useEffect(() => {
    if (!visible) return;
    const p = parseDate(value);
    if (p) {
      setYear(p.y);
      setMonth(p.m);
      setSelectedDay(p.d);
    } else {
      setYear(today.getFullYear());
      setMonth(today.getMonth());
      setSelectedDay(null);
    }
  }, [visible, value]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
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

  const isDisabled = (day: number): boolean => {
    if (!minDate) return false;
    return toYMD(year, month, day) < minDate;
  };

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const handleConfirm = () => {
    if (selectedDay) {
      onConfirm(toYMD(year, month, selectedDay));
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* 배경 딤 */}
      <TouchableOpacity style={ss.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={ss.sheet}>
        {/* 월 이동 헤더 */}
        <View style={ss.header}>
          <TouchableOpacity onPress={prevMonth} style={ss.navBtn}>
            <Text style={ss.navText}>‹</Text>
          </TouchableOpacity>
          <Text style={ss.headerTitle}>{year}년 {month + 1}월</Text>
          <TouchableOpacity onPress={nextMonth} style={ss.navBtn}>
            <Text style={ss.navText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 요일 헤더 */}
        <View style={ss.weekRow}>
          {DAYS.map((d, i) => (
            <Text
              key={d}
              style={[ss.dayLabel, i === 0 && ss.sunLabel, i === 6 && ss.satLabel]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* 날짜 그리드 */}
        {rows.map((row, ri) => (
          <View key={ri} style={ss.weekRow}>
            {Array.from({ length: 7 }, (_, ci) => {
              const day = row[ci] ?? null;
              const disabled = day !== null && isDisabled(day);
              const selected = day !== null && day === selectedDay;
              const todayCell = day !== null && isToday(day);

              return (
                <TouchableOpacity
                  key={ci}
                  style={ss.dayCell}
                  onPress={() => day && !disabled && setSelectedDay(day)}
                  disabled={!day || disabled}
                  activeOpacity={0.7}
                >
                  {day ? (
                    <View style={[
                      ss.dayInner,
                      selected && ss.selectedInner,
                      todayCell && !selected && ss.todayInner,
                    ]}>
                      <Text style={[
                        ss.dayText,
                        ci === 0 && ss.sunText,
                        ci === 6 && ss.satText,
                        selected && ss.selectedText,
                        todayCell && !selected && ss.todayText,
                        disabled && ss.disabledText,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  ) : (
                    <View style={ss.dayInner} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* 버튼 */}
        <View style={ss.btnRow}>
          <TouchableOpacity style={ss.cancelBtn} onPress={onClose}>
            <Text style={ss.cancelText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ss.confirmBtn, !selectedDay && ss.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!selectedDay}
          >
            <Text style={ss.confirmText}>선택</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  navBtn: { padding: 8 },
  navText: { fontSize: 26, color: '#4A90E2', lineHeight: 28 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },

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
  selectedInner: { backgroundColor: '#4A90E2' },
  todayInner: { borderWidth: 1.5, borderColor: '#4A90E2' },

  dayText: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
  sunText: { color: '#e05252' },
  satText: { color: '#4A90E2' },
  selectedText: { color: '#fff', fontWeight: '700' },
  todayText: { color: '#4A90E2', fontWeight: '700' },
  disabledText: { color: '#ccc' },

  btnRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 8,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#888' },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#b0c9ef' },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
