import React from 'react';
import { View, ViewStyle } from 'react-native';

interface GlowOrbProps {
  color: string;
  size?: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  opacity?: number;
  style?: ViewStyle;
}

export const GlowOrb = ({ color, size = 200, top, left, right, bottom, opacity = 0.15, style }: GlowOrbProps) => {
  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          top,
          left,
          right,
          bottom,
          pointerEvents: 'none',
        },
        style,
      ]}
    />
  );
};
