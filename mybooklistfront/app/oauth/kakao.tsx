import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { authApi } from '../../src/services/api';

const KAKAO_CLIENT_ID = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY!;
export const WEB_REDIRECT_URI = 'https://bookfood-ruby.vercel.app/oauth/kakao';

export default function KakaoCallback() {
  const { login } = useAuth();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (code) {
      exchangeCode(code);
    } else {
      setError(true);
    }
  }, [code]);

  const exchangeCode = async (code: string) => {
    try {
      const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: KAKAO_CLIENT_ID,
          redirect_uri: WEB_REDIRECT_URI,
          code,
        }).toString(),
      });
      const tokenData = await tokenRes.json();
      const userData = await authApi.kakaoLogin(tokenData.access_token);
      await login(userData);
      router.replace('/(tabs)');
    } catch {
      setError(true);
    }
  };

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>로그인에 실패했습니다. 다시 시도해주세요.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF6EC' }}>
      <ActivityIndicator size="large" color="#D98743" />
    </View>
  );
}