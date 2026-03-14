import React from 'react';
import { Switch as RNSwitch, View, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
}

export const Switch = ({ value, onValueChange, label }: SwitchProps) => {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {label && (
        <Text style={{ fontSize: 16, color: colors.foreground, fontFamily: 'Inter_500Medium' }}>
          {label}
        </Text>
      )}
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.muted, true: colors.primary }}
        thumbColor="#ffffff"
      />
    </View>
  );
};
