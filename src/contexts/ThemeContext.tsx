import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { storage } from '@/lib/storage';
import { lightColors, darkColors, ColorTokens } from '@/theme/colors';
import { shadows, darkShadows } from '@/theme/shadows';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorTokens;
  shadows: typeof shadows;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme_mode';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useRNColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    storage.getString(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setHydrated(true);
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    storage.setString(THEME_STORAGE_KEY, newMode);
  };

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const currentShadows = isDark ? darkShadows : shadows;

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, shadows: currentShadows, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
