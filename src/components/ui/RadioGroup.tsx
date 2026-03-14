import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onValueChange: (value: string) => void;
}

export const RadioGroup = ({ options, value, onValueChange }: RadioGroupProps) => {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onValueChange(option.value)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor: selected ? colors.primary : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {selected && (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.primary,
                  }}
                />
              )}
            </View>
            <Text style={{ fontSize: 15, color: colors.foreground, fontFamily: 'Inter_400Regular' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
