import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge = ({ children, variant = 'primary', style, textStyle }: BadgeProps) => {
  const { colors } = useTheme();

  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.primary + '15', text: colors.primary },
    secondary: { bg: colors.secondary + '15', text: colors.secondary },
    success: { bg: colors.success + '15', text: colors.success },
    warning: { bg: colors.warning + '15', text: colors.warning },
    outline: { bg: 'transparent', text: colors.foreground, border: colors.border },
  };

  const v = variantStyles[variant];

  return (
    <View
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 9999,
          backgroundColor: v.bg,
          alignSelf: 'flex-start',
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <Text
          style={[
            {
              fontSize: 12,
              fontWeight: '600',
              color: v.text,
              fontFamily: 'Inter_600SemiBold',
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
};
