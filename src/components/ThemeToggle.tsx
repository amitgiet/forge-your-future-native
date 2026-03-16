import React from 'react';
import { Pressable } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeToggle = () => {
  const { isDark, setMode, colors } = useTheme();

  return (
    <Pressable
      onPress={() => setMode(isDark ? 'light' : 'dark')}
      style={{
        width: 40,
        height: 40,
        borderRadius: 22,
        backgroundColor: colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isDark ? (
        <Sun size={20} color={colors.warning} />
      ) : (
        <Moon size={20} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
};

export default ThemeToggle;
