import { Tabs } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { paddingBottom: 4 },
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarLabel: '홈',
          tabBarIcon: ({ color }) => <TabIcon label="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: '책 검색',
          tabBarLabel: '검색',
          tabBarIcon: ({ color }) => <TabIcon label="🔍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: '마이페이지',
          tabBarLabel: '마이페이지',
          tabBarIcon: ({ color }) => <TabIcon label="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}
