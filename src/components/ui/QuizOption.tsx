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
  const { colors, shadows } = useTheme();

  const stateStyles: Record<OptionState, { bg: string; border: string; labelBg: string; labelText: string }> = {
    default: {
      bg: colors.card,
      border: colors.border,
      labelBg: colors.muted,
      labelText: colors.mutedForeground,
    },
    selected: {
      bg: colors.primary + '15',
      border: colors.primary,
      labelBg: colors.primary,
      labelText: '#ffffff',
    },
    correct: {
      bg: colors.success + '15',
      border: colors.success,
      labelBg: colors.success,
      labelText: '#ffffff',
    },
    incorrect: {
      bg: colors.destructive + '15',
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
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: state === 'default' ? 1 : 2.5,
        backgroundColor: s.bg,
        borderColor: s.border,
        gap: 16,
        minHeight: 64,
        // opacity: pressed ? 0.9 : 1,
        ...style,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: s.labelBg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: state === 'selected' ? 1.5 : 0,
          borderColor: '#ffffff',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '800',
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
          fontWeight: state !== 'default' ? '600' : '500',
          color: state === 'default' ? colors.foreground : (state === 'selected' ? colors.primary : colors.foreground),
          fontFamily: state !== 'default' ? 'Inter_600SemiBold' : 'Inter_500Medium',
          lineHeight: 22,
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
};
