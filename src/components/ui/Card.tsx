import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
  className?: string;
}

export const Card = ({ children, style, elevated }: CardProps) => {
  const { colors, shadows } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: elevated ? colors.cardElevated : colors.card,
          borderRadius: 15,
          padding: 16,
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
