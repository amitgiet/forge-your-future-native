import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { gradients, gradientProps } from '@/theme/gradients';

interface ProgressProps {
  value: number; // 0-100
  gradient?: keyof typeof gradients;
  color?: string;
  height?: number;
  style?: ViewStyle;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const Progress = ({ value, gradient = 'primary', color, height = 8, style }: ProgressProps) => {
  const { colors } = useTheme();
  const clampedValue = Math.min(100, Math.max(0, value));

  const animatedWidth = useAnimatedStyle(() => ({
    width: withTiming(`${clampedValue}%`, { duration: 600 }),
  }));

  return (
    <View
      style={[
        {
          height,
          borderRadius: 9999,
          backgroundColor: colors.muted,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {color ? (
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: 9999,
              backgroundColor: color,
            },
            animatedWidth,
          ]}
        />
      ) : (
        <AnimatedLinearGradient
          colors={[...gradients[gradient]]}
          start={gradientProps.start}
          end={gradientProps.end}
          style={[
            {
              height: '100%',
              borderRadius: 9999,
            },
            animatedWidth,
          ]}
        />
      )}
    </View>
  );
};
