import React from 'react';
import { Text, TextStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, gradientProps } from '@/theme/gradients';

interface GradientTextProps {
  children: string;
  gradient?: keyof typeof gradients;
  style?: TextStyle;
}

// Note: @react-native-masked-view/masked-view needs to be installed for this.
// Fallback to primary-colored text if MaskedView is not available.
export const GradientText = ({ children, gradient = 'primary', style }: GradientTextProps) => {
  try {
    return (
      <MaskedView
        maskElement={
          <Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>
        }
      >
        <LinearGradient
          colors={[...gradients[gradient]]}
          start={gradientProps.start}
          end={gradientProps.end}
        >
          <Text style={[style, { opacity: 0 }]}>{children}</Text>
        </LinearGradient>
      </MaskedView>
    );
  } catch {
    // Fallback if MaskedView not installed
    return (
      <Text style={[style, { color: gradients[gradient][0] }]}>{children}</Text>
    );
  }
};
