import React from 'react';
import { View, Text, ViewStyle, ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/ThemeContext';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  style?: ViewStyle;
}

export const Avatar = ({ uri, name, size = 40, style }: AvatarProps) => {
  const { colors } = useTheme();
  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.muted,
          } as ImageStyle,
          style as any,
        ]}
        cachePolicy="disk"
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary + '20',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: size * 0.4,
          fontWeight: '700',
          color: colors.primary,
          fontFamily: 'Inter_700Bold',
        }}
      >
        {initials}
      </Text>
    </View>
  );
};
