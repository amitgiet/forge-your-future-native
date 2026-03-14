import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { radii } from '@/theme/spacing';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  small?: boolean;
}

export const GlassCard = ({ children, style, small }: GlassCardProps) => {
  const { colors, shadows } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: small ? radii.sm : radii.md,
          padding: small ? 14 : 20,
          borderWidth: 1,
          borderColor: colors.border,
          ...shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

