import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Modal,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useAuth } from '../src/context/AuthContext';
import { authApi } from '../src/services/api';

const KAKAO_CLIENT_ID = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY!;
const REDIRECT_URI = 'https://mybooklist.app/oauth/kakao';

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const [showWebView, setShowWebView] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  // 로그인 상태 확인 후 탭으로 이동
  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  // 뒤로가기 두 번 → 앱 종료
  const lastBackPress = useRef<number>(0);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        BackHandler.exitApp();
        return true;
      }
      lastBackPress.current = now;
      ToastAndroid.show('한 번 더 누르면 앱을 종료합니다.', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, []);

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
      if (code) exchangeCodeForToken(code);
      return false;
    }
    return true;
  };

  const exchangeCodeForToken = async (code: string) => {
    setExchanging(true);
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
      await login(userData);
    } catch {
      Alert.alert('오류', '로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setExchanging(false);
    }
  };

  if (loading || user) {
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

      <TouchableOpacity
        style={styles.kakaoButton}
        onPress={() => setShowWebView(true)}
        disabled={exchanging}
      >
        {exchanging
          ? <ActivityIndicator color="#1a1a1a" />
          : <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
        }
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
  root: { flex: 1, backgroundColor: '#fff' },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  splashImage: {
    width: '80%',
    height: '80%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 12, color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 60 },
  kakaoButton: {
    backgroundColor: '#FEE500',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    height: 52,
    justifyContent: 'center',
  },
  kakaoButtonText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  webViewContainer: { flex: 1, paddingTop: 50 },
  closeButton: { padding: 16, alignItems: 'flex-end' },
  closeText: { fontSize: 16, color: '#666' },
});
