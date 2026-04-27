export interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryLight: string;
  tabBar: string;
  tabBarBorder: string;
  inputBg: string;
  danger: string;
  success: string;
  warning: string;
}

export const lightTheme: ThemeColors = {
  bg: '#F4F6FF',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  primary: '#6366F1',
  primaryLight: '#EEF2FF',
  tabBar: 'rgba(255,255,255,0.94)',
  tabBarBorder: '#E2E8F0',
  inputBg: '#F8FAFF',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

export const darkTheme: ThemeColors = {
  bg: '#060A15',
  card: '#0F1729',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#475569',
  border: 'rgba(255,255,255,0.08)',
  primary: '#818CF8',
  primaryLight: 'rgba(129,140,248,0.15)',
  tabBar: 'rgba(6,10,21,0.88)',
  tabBarBorder: 'rgba(255,255,255,0.06)',
  inputBg: 'rgba(255,255,255,0.06)',
  danger: '#F87171',
  success: '#34D399',
  warning: '#FCD34D',
};
