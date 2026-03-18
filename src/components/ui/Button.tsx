import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { gradients, gradientProps } from '@/theme/gradients';
import { radii } from '@/theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  className?: string;
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'default',
  onPress,
  disabled,
  loading,
  style,
  textStyle,
}: ButtonProps) => {
  const { colors, isDark } = useTheme();

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    default: { minHeight: 48, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radii.md },
    sm: { minHeight: 36, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radii.sm },
    lg: { minHeight: 56, paddingHorizontal: 32, paddingVertical: 16, borderRadius: radii.lg },
    icon: { width: 40, height: 40, borderRadius: radii.md, paddingHorizontal: 0, paddingVertical: 0 },
  };

  const textSizeStyles: Record<ButtonSize, TextStyle> = {
    default: { fontSize: 16, fontWeight: '600' },
    sm: { fontSize: 14, fontWeight: '600' },
    lg: { fontSize: 18, fontWeight: '600' },
    icon: { fontSize: 16, fontWeight: '600' },
  };

  const isGradient = variant === 'primary' || variant === 'secondary';
  const gradientColors = variant === 'primary' ? gradients.primary : gradients.secondary;

  const getContainerStyle = (): ViewStyle => {
    const base = {
      ...sizeStyles[size],
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: 8,
      opacity: disabled ? 0.5 : 1,
    };

    if (variant === 'outline') {
      return { ...base, borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' };
    }
    if (variant === 'ghost') {
      return { ...base, backgroundColor: 'transparent' };
    }
    if (variant === 'destructive') {
      return { ...base, backgroundColor: colors.destructive };
    }
    if (!isGradient) {
      return { ...base, backgroundColor: colors.primary };
    }
    return base;
  };

  const getTextColor = (): string => {
    if (variant === 'outline' || variant === 'ghost') return colors.foreground;
    return '#ffffff';
  };

  const content = (
    <>
      {loading && <ActivityIndicator size="small" color={getTextColor()} />}
      {typeof children === 'string' ? (
        <Text style={[textSizeStyles[size], { color: getTextColor(), fontFamily: 'Inter_600SemiBold' }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </>
  );

  if (isGradient && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={{ opacity: 1, ...style }}
      >
        <LinearGradient
          colors={[...gradientColors]}
          start={gradientProps.start}
          end={gradientProps.end}
          style={[getContainerStyle(), { overflow: 'hidden' }]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{ opacity: 1, ...style }}
    >
      {content}
    </Pressable>
  );
};
