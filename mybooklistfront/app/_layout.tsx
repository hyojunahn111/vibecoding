import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';

function SplashOverlay() {
  const [done, setDone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => setDone(true));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (done) return null;

  return (
    <Animated.View style={[styles.splash, { opacity }]}>
      <Image
        source={require('../assets/bookfood3.png')}
        style={styles.splashImage}
        resizeMode="cover"
        resizeMethod="scale"
      />
    </Animated.View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="book/[isbn]"
            options={{ headerShown: true, title: '책 상세', headerBackTitle: '뒤로' }}
          />
        </Stack>
        <SplashOverlay />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
