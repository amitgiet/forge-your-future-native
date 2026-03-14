import React, { useState } from 'react';
import { View, TextInput, Text, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input = ({ label, error, containerStyle, style, ...props }: InputProps) => {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: colors.foreground,
            marginBottom: 6,
            fontFamily: 'Inter_500Medium',
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            minHeight: 48,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            fontFamily: 'Inter_400Regular',
            backgroundColor: colors.input,
            color: colors.foreground,
            borderWidth: focused ? 2 : 1,
            borderColor: error
              ? colors.destructive
              : focused
              ? colors.primary
              : colors.border,
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text
          style={{
            fontSize: 12,
            color: colors.destructive,
            marginTop: 4,
            fontFamily: 'Inter_400Regular',
          }}
        >
          {error}
        </Text>
      )}
    </View>
  );
};
