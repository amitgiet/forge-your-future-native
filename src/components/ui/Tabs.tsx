import React, { useState } from 'react';
import { View, Pressable, Text, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onTabChange: (key: string) => void;
  style?: ViewStyle;
}

export const Tabs = ({ tabs, activeKey, onTabChange, style }: TabsProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.muted,
          borderRadius: 12,
          padding: 4,
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
              backgroundColor: isActive ? colors.card : 'transparent',
              ...(isActive ? { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 } : {}),
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: isActive ? '600' : '500',
                color: isActive ? colors.foreground : colors.mutedForeground,
                fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
