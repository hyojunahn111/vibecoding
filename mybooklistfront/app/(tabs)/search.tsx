import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { bookApi } from '../../src/services/api';
import { useSearchHistory } from '../../src/hooks/useSearchHistory';
import { Book } from '../../src/types';

export default function SearchScreen() {
  const router = useRouter();
  const { history, save, remove, clear } = useSearchHistory();
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [suggestions, setSuggestions] = useState<Book[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isEnd, setIsEnd] = useState(false);
  const [searchBarHeight, setSearchBarHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const showDropdown = showSuggestions || showHistory;

  const dismissDropdown = () => {
    setShowSuggestions(false);
    setShowHistory(false);
    Keyboard.dismiss();
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setShowHistory(false);
    debounceTimer.current = setTimeout(async () => {
      try {
        const res = await bookApi.search(query, 1, 5);
        setSuggestions(res.documents);
        setShowSuggestions(res.documents.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  const search = async (searchQuery: string, newSearch = false) => {
    if (!searchQuery.trim() || loading) return;
    const currentPage = newSearch ? 1 : page;
    setLoading(true);
    try {
      const res = await bookApi.search(searchQuery, currentPage, 10);
      setBooks(newSearch ? res.documents : prev => [...prev, ...res.documents]);
      setIsEnd(res.meta.is_end);
      setPage(currentPage + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    dismissDropdown();
    setQuery(searchQuery);
    setPage(1);
    setIsEnd(false);
    save(searchQuery);
    search(searchQuery, true);
  };

  const handleSelectSuggestion = (book: Book) => {
    dismissDropdown();
    save(book.title);
    router.push({
      pathname: '/book/[isbn]',
      params: { isbn: book.isbn, book: JSON.stringify(book) },
    });
  };

  const handleFocus = () => {
    if (!query.trim() && history.length > 0) {
      setShowHistory(true);
    }
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setShowHistory(history.length > 0);
    } else {
      setShowHistory(false);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={styles.searchBar}
        onLayout={e => setSearchBarHeight(e.nativeEvent.layout.height)}
      >
        <TextInput
          style={styles.input}
          placeholder="책 제목, 저자, ISBN 검색"
          value={query}
          onChangeText={handleChangeText}
          onSubmitEditing={() => handleSearch()}
          returnKeyType="search"
          onFocus={handleFocus}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={() => handleSearch()}>
          <Text style={styles.searchBtnText}>검색</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={books}
        keyExtractor={(item, index) => `${item.isbn}-${index}`}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookItem}
            onPress={() => {
              if (keyboardVisible) {
                Keyboard.dismiss();
                return;
              }
              router.push({
                pathname: '/book/[isbn]',
                params: { isbn: item.isbn, book: JSON.stringify(item) },
              });
            }}
          >
            {item.thumbnail ? (
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.noImage]}>
                <Text style={styles.noImageText}>📚</Text>
              </View>
            )}
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.bookAuthor} numberOfLines={1}>
                {item.authors.join(', ')}
              </Text>
              <Text style={styles.bookPublisher} numberOfLines={1}>{item.publisher}</Text>
            </View>
          </TouchableOpacity>
        )}
        onEndReached={() => !isEnd && search(query)}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 16 }} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>검색어를 입력해주세요</Text>
            </View>
          ) : null
        }
      />

      {showDropdown && (
        <TouchableWithoutFeedback onPress={dismissDropdown}>
          <View style={[StyleSheet.absoluteFillObject, { top: searchBarHeight }]} />
        </TouchableWithoutFeedback>
      )}

      {showDropdown && (
        <View style={[styles.dropdown, { top: searchBarHeight }]}>
          {showSuggestions && suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.isbn}-${index}`}
              style={[styles.suggestionItem, index < suggestions.length - 1 && styles.itemBorder]}
              onPress={() => handleSelectSuggestion(item)}
            >
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.suggestionThumb} />
              ) : (
                <View style={[styles.suggestionThumb, styles.noImage]}>
                  <Text style={{ fontSize: 14 }}>📚</Text>
                </View>
              )}
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.suggestionAuthor} numberOfLines={1}>
                  {item.authors.join(', ')} · {item.publisher}
                </Text>
              </View>
            </TouchableOpacity>
          ))}

          {showHistory && (
            <>
              <View style={styles.historyHeader}>
                <Text style={styles.historyHeaderText}>최근 검색어</Text>
                <TouchableOpacity onPress={clear}>
                  <Text style={styles.clearAllText}>전체 삭제</Text>
                </TouchableOpacity>
              </View>
              {history.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.historyItem, index < history.length - 1 && styles.itemBorder]}
                  onPress={() => handleSearch(item)}
                >
                  <Text style={styles.historyIcon}>🕐</Text>
                  <Text style={styles.historyText} numberOfLines={1}>{item}</Text>
                  <TouchableOpacity
                    onPress={() => remove(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#A67B5B',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#FDF6EC', fontWeight: '600' },
  dropdown: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 20,
    overflow: 'hidden',
  },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  suggestionThumb: { width: 36, height: 50, borderRadius: 3 },
  noImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionInfo: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  suggestionAuthor: { fontSize: 12, color: '#999', marginTop: 2 },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyHeaderText: { fontSize: 13, fontWeight: '600', color: '#888' },
  clearAllText: { fontSize: 13, color: '#4A90E2' },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  historyIcon: { fontSize: 14 },
  historyText: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  removeText: { fontSize: 13, color: '#bbb' },
  bookItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  thumbnail: { width: 60, height: 85, borderRadius: 4 },
  noImageText: { fontSize: 24 },
  bookInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  bookAuthor: { fontSize: 13, color: '#555' },
  bookPublisher: { fontSize: 12, color: '#999' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#aaa', fontSize: 15 },
});
