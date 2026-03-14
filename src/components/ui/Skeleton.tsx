import React from 'react';
import { ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) => {
  const { colors } = useTheme();

  return (
    <MotiView
      from={{ opacity: 1 }}
      animate={{ opacity: 0.5 }}
      transition={{
        loop: true,
        duration: 1000,
        type: 'timing',
      }}
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.muted,
        },
        style,
      ]}
    />
  );
};
