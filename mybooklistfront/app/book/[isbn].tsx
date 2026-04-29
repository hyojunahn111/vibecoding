import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { favoriteApi } from '../../src/services/api';
import { Book } from '../../src/types';

export default function BookDetailScreen() {
  const { book: bookParam } = useLocalSearchParams<{ isbn: string; book: string }>();
  const router = useRouter();
  const book: Book = JSON.parse(bookParam);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    favoriteApi.check(book.isbn).then(setIsFavorite);
  }, [book.isbn]);

  const toggleFavorite = async () => {
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await favoriteApi.remove(book.isbn);
        setIsFavorite(false);
        Alert.alert('', '즐겨찾기에서 제거되었습니다.');
      } else {
        await favoriteApi.add({
          isbn: book.isbn,
          title: book.title,
          authors: book.authors.join(', '),
          thumbnail: book.thumbnail,
          publisher: book.publisher,
          publishedDate: book.datetime ? book.datetime.substring(0, 10) : '',
          contents: book.contents,
          url: book.url,
          price: book.price,
        });
        setIsFavorite(true);
        Alert.alert('', '마이페이지에 저장되었습니다.');
      }
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const publishDate = book.datetime ? book.datetime.substring(0, 10) : '-';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {book.thumbnail ? (
          <Image source={{ uri: book.thumbnail }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.noCover]}>
            <Text style={styles.noCoverText}>📚</Text>
          </View>
        )}

        <View style={styles.headerInfo}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.authors.join(', ')}</Text>
          <Text style={styles.publisher}>
            {book.publisher} · {publishDate}
          </Text>
          {book.price > 0 && (
            <Text style={styles.price}>{book.price.toLocaleString()}원</Text>
          )}

          <TouchableOpacity
            style={[styles.favoriteBtn, isFavorite && styles.favoriteBtnActive]}
            onPress={toggleFavorite}
            disabled={favoriteLoading}
          >
            <Text style={[styles.favoriteBtnText, isFavorite && styles.favoriteBtnTextActive]}>
              {isFavorite ? '★ 즐겨찾기 됨' : '☆ 즐겨찾기 추가'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {book.contents && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>책 소개</Text>
          <Text style={styles.contents}>{book.contents}</Text>
        </View>
      )}

      {book.isbn && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>도서 정보</Text>
          <InfoRow label="ISBN" value={book.isbn} />
          <InfoRow label="출판사" value={book.publisher} />
          <InfoRow label="출판일" value={publishDate} />
          {book.translators?.length > 0 && (
            <InfoRow label="번역" value={book.translators.join(', ')} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cover: { width: 100, height: 145, borderRadius: 6 },
  noCover: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCoverText: { fontSize: 36 },
  headerInfo: { flex: 1, gap: 6 },
  title: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a', lineHeight: 24 },
  author: { fontSize: 14, color: '#444' },
  publisher: { fontSize: 13, color: '#888' },
  price: { fontSize: 15, fontWeight: '600', color: '#4A90E2' },
  favoriteBtn: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  favoriteBtnActive: {
    backgroundColor: '#4A90E2',
  },
  favoriteBtnText: { color: '#4A90E2', fontWeight: '600', fontSize: 14 },
  favoriteBtnTextActive: { color: '#fff' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10, color: '#1a1a1a' },
  contents: { fontSize: 14, color: '#444', lineHeight: 22 },
  infoRow: { flexDirection: 'row', paddingVertical: 6, gap: 12 },
  infoLabel: { width: 60, fontSize: 13, color: '#888' },
  infoValue: { flex: 1, fontSize: 13, color: '#333' },
});