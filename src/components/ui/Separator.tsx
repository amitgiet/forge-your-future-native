import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SeparatorProps {
  style?: ViewStyle;
  vertical?: boolean;
}

export const Separator = ({ style, vertical }: SeparatorProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: colors.border }
          : { height: 1, width: '100%', backgroundColor: colors.border },
        style,
      ]}
    />
  );
};
