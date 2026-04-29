import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="book/[isbn]"
          options={{ headerShown: true, title: '책 상세', headerBackTitle: '뒤로' }}
        />
      </Stack>
    </>
  );
}