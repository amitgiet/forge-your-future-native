import React from 'react';
import { Pressable, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

type OptionState = 'default' | 'selected' | 'correct' | 'incorrect';

interface QuizOptionProps {
  label: string;
  text: string;
  state?: OptionState;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const QuizOption = ({
  label,
  text,
  state = 'default',
  onPress,
  disabled,
  style,
}: QuizOptionProps) => {
  const { colors, isDark } = useTheme();

  const stateStyles: Record<OptionState, { bg: string; border: string; labelBg: string; labelText: string }> = {
    default: {
      bg: colors.card,
      border: colors.border,
      labelBg: colors.muted,
      labelText: colors.mutedForeground,
    },
    selected: {
      bg: colors.primary + '08',
      border: colors.primary,
      labelBg: colors.primary,
      labelText: '#ffffff',
    },
    correct: {
      bg: colors.success + '08',
      border: colors.success,
      labelBg: colors.success,
      labelText: '#ffffff',
    },
    incorrect: {
      bg: colors.destructive + '08',
      border: colors.destructive,
      labelBg: colors.destructive,
      labelText: '#ffffff',
    },
  };

  const s = stateStyles[state];

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderRadius: 12,
          borderWidth: state === 'default' ? 1 : 2,
          backgroundColor: s.bg,
          borderColor: s.border,
          gap: 12,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: s.labelBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: s.labelText,
            fontFamily: 'Inter_700Bold',
          }}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          color: colors.foreground,
          fontFamily: 'Inter_400Regular',
          lineHeight: 22,
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
};
