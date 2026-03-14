import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
}

export const Checkbox = ({ checked, onCheckedChange, label }: CheckboxProps) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onCheckedChange(!checked)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? colors.primary : colors.border,
          backgroundColor: checked ? colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </View>
      {label && (
        <Text style={{ fontSize: 15, color: colors.foreground, fontFamily: 'Inter_400Regular' }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};
