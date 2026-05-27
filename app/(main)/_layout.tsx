import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FDFAF6',
          borderTopColor: '#F0F0F0',
        },
        tabBarActiveTintColor: '#4A7C59',
        tabBarInactiveTintColor: '#aaa',
      }}
    >
      <Tabs.Screen
        name="village/index"
        options={{
          title: '마을',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏘</Text>,
        }}
      />
      <Tabs.Screen
        name="matching/index"
        options={{
          title: '매칭',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>✉️</Text>,
        }}
      />
      <Tabs.Screen
        name="shop/index"
        options={{
          title: '포인트샵',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛍</Text>,
        }}
      />
      <Tabs.Screen name="tutorial" options={{ href: null }} />
      <Tabs.Screen name="village/avatar" options={{ href: null }} />
      <Tabs.Screen name="village/category" options={{ href: null }} />
      <Tabs.Screen name="matching/letter/inbox" options={{ href: null }} />
      <Tabs.Screen name="matching/letter/write" options={{ href: null }} />
      <Tabs.Screen name="matching/letter/status" options={{ href: null }} />
    </Tabs>
  );
}