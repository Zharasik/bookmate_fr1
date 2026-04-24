import { useMemo } from 'react';
import { useStore } from './useStore';
import { lightTheme, darkTheme, ThemeColors } from '../constants/theme';
import translations, { Lang } from '../constants/i18n';

export function useTheme(): ThemeColors {
  const dark = useStore((s) => s.dark);
  return dark ? darkTheme : lightTheme;
}

export function useT(): (key: string) => string {
  const lang = useStore((s) => s.lang);
  return useMemo(() => {
    const dict = translations[lang] || translations.ru;
    return (key: string) => dict[key] || key;
  }, [lang]);
}
