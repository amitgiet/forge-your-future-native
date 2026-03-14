import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  small?: boolean;
}

export const GlassCard = ({ children, style, small }: GlassCardProps) => {
  const { colors, shadows, isDark } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: isDark
            ? 'rgba(24, 29, 39, 0.8)'
            : 'rgba(255, 255, 255, 0.85)',
          borderRadius: small ? 8 : 12,
          padding: small ? 14 : 20,
          borderWidth: 1,
          borderColor: isDark
            ? 'rgba(255,255,255,0.08)'
            : 'rgba(255,255,255,0.5)',
          ...shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};
