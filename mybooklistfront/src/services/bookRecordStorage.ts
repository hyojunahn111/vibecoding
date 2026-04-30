import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookRecord } from '../types';

const KEY = '@book_records_v1';

export async function getAllRecords(): Promise<BookRecord[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveRecord(record: BookRecord): Promise<void> {
  const records = await getAllRecords();
  const idx = records.findIndex(r => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(records));
}

export async function deleteRecord(id: string): Promise<void> {
  const records = await getAllRecords();
  await AsyncStorage.setItem(KEY, JSON.stringify(records.filter(r => r.id !== id)));
}

export async function getRecordsForDate(date: string): Promise<BookRecord[]> {
  const records = await getAllRecords();
  return records.filter(r => r.date === date);
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekRange(today: Date): { start: string; end: string } {
  const d = new Date(today);
  const day = d.getDay(); // 0=일, 1=월
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { start: toYMD(mon), end: toYMD(sun) };
}

export async function getCompletedStats(): Promise<{ year: number; month: number; week: number }> {
  const records = await getAllRecords();
  const completed = records.filter(r => r.status === 'completed');
  const today = new Date();
  const yyyymm = toYMD(today).slice(0, 7);
  const yyyy = toYMD(today).slice(0, 4);
  const { start, end } = getWeekRange(today);

  return {
    year: completed.filter(r => r.date.startsWith(yyyy)).length,
    month: completed.filter(r => r.date.startsWith(yyyymm)).length,
    week: completed.filter(r => r.date >= start && r.date <= end).length,
  };
}