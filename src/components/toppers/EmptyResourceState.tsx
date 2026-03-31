import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

type EmptyResourceStateProps = {
  title: string;
  description: string;
};

export default function EmptyResourceState({ title, description }: EmptyResourceStateProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.muted,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 24 }}>{"\uD83D\uDCDA"}</Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>{title}</Text>
      <Text style={{ marginTop: 8, fontSize: 14, color: colors.mutedForeground, textAlign: 'center' }}>{description}</Text>
    </View>
  );
}
