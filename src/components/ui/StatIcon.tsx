import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface StatIconProps {
  children: React.ReactNode;
  color?: string;
  style?: ViewStyle;
}

export const StatIcon = ({ children, color, style }: StatIconProps) => {
  const { colors } = useTheme();
  const bgColor = color || colors.primary;

  return (
    <View
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: bgColor + '15',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
