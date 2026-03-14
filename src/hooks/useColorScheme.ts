import { useTheme } from '@/contexts/ThemeContext';

export const useColorScheme = () => {
  const { isDark, colors, shadows } = useTheme();
  return { isDark, colors, shadows };
};
