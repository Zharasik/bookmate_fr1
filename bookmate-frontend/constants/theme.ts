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
  bg: '#F9FAFB',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#2563EB',
  primaryLight: '#DBEAFE',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  inputBg: '#FFFFFF',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#FBBF24',
};

export const darkTheme: ThemeColors = {
  bg: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textMuted: '#6B7280',
  border: '#374151',
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  tabBar: '#1F2937',
  tabBarBorder: '#374151',
  inputBg: '#374151',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#FBBF24',
};
