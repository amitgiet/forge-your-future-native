import React from 'react';
import { Tabs } from 'expo-router';
import BottomNav from '@/components/BottomNav';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tests/index" />
      <Tabs.Screen name="ai-assistant" />
      <Tabs.Screen name="social/index" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
