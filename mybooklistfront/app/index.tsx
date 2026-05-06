import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
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
const { height: SCREEN_H } = Dimensions.get('window');

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const [showWebView, setShowWebView] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

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
        <ActivityIndicator size="large" color="#D98743" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 풀스크린 일러스트 배경 */}
      <Image
        source={require('../assets/bookfood3.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* 어두운 오버레이 */}
      <View style={styles.overlay} />

      {/* 중앙 로그인 카드 */}
      <View style={styles.card}>
        <Text style={styles.brandSub}>BOOKFOOD</Text>
        <Text style={styles.title}>책식</Text>
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
      </View>

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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6EC' },

  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30, 16, 8, 0.38)',
  },

  card: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 32,
    paddingBottom: 56,
    paddingTop: SCREEN_H * 0.52,
    gap: 0,
  },
  brandSub: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(253,246,236,0.7)',
    letterSpacing: 4,
    marginBottom: 6,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FDF6EC',
    lineHeight: 54,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(253,246,236,0.75)',
    marginBottom: 40,
  },

  kakaoButton: {
    backgroundColor: '#FEE500',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  kakaoButtonText: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },

  webViewContainer: { flex: 1, paddingTop: 50 },
  closeButton: { padding: 16, alignItems: 'flex-end' },
  closeText: { fontSize: 16, color: '#666' },
});