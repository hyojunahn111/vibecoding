import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { authApi } from '../src/services/api';

const KAKAO_CLIENT_ID = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY!;
const REDIRECT_URI = 'https://mybooklist.app/oauth/kakao';

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showWebView, setShowWebView] = useState(false);

  useEffect(() => {
    checkExistingToken();
  }, []);

  const checkExistingToken = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      router.replace('/(tabs)');
    } else {
      setLoading(false);
    }
  };

  const kakaoAuthUrl =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${KAKAO_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code`;

  const handleShouldStartLoad = (navState: WebViewNavigation) => {
    const { url } = navState;
    if (url.startsWith(REDIRECT_URI)) {
      setShowWebView(false);
      const code = new URL(url).searchParams.get('code');
      if (code) {
        exchangeCodeForToken(code);
      }
      return false; // 실제 URL 로딩 차단
    }
    return true;
  };

  const exchangeCodeForToken = async (code: string) => {
    setLoading(true);
    try {
      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KAKAO_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          code,
        }).toString(),
      });
      const tokenData = await tokenRes.json();
      const userData = await authApi.kakaoLogin(tokenData.access_token);

      await AsyncStorage.setItem('accessToken', userData.accessToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      router.replace('/(tabs)');
    } catch {
      Alert.alert('오류', '로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FEE500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📚 나의 책 목록</Text>
      <Text style={styles.subtitle}>읽은 책을 기록하고 관리하세요</Text>

      <TouchableOpacity style={styles.kakaoButton} onPress={() => setShowWebView(true)}>
        <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
      </TouchableOpacity>

      <Modal visible={showWebView} animationType="slide">
        <View style={styles.webViewContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowWebView(false)}>
            <Text style={styles.closeText}>✕ 닫기</Text>
          </TouchableOpacity>
          <WebView
            source={{ uri: kakaoAuthUrl }}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 60,
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  kakaoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  webViewContainer: {
    flex: 1,
    paddingTop: 50,
  },
  closeButton: {
    padding: 16,
    alignItems: 'flex-end',
  },
  closeText: {
    fontSize: 16,
    color: '#666',
  },
});