import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang } from '../constants/i18n';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  role: 'user' | 'business' | 'admin';
}

interface AppState {
  // Auth
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;

  // Theme
  dark: boolean;
  toggleTheme: () => void;

  // Language
  lang: Lang;
  setLang: (l: Lang) => void;

  // Hydrate from AsyncStorage
  hydrate: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  token: null,
  user: null,
  dark: false,
  lang: 'ru',

  setAuth: (token, user) => {
    set({ token, user });
    AsyncStorage.setItem('token', token);
    AsyncStorage.setItem('user', JSON.stringify(user));
  },

  logout: () => {
    set({ token: null, user: null });
    AsyncStorage.multiRemove(['token', 'user']);
  },

  toggleTheme: () => {
    const next = !get().dark;
    set({ dark: next });
    AsyncStorage.setItem('dark', String(next));
  },

  setLang: (lang) => {
    set({ lang });
    AsyncStorage.setItem('lang', lang);
  },

  hydrate: async () => {
    try {
      const [token, userStr, dark, lang] = await AsyncStorage.multiGet([
        'token', 'user', 'dark', 'lang',
      ]);
      set({
        token: token[1] || null,
        user: userStr[1] ? JSON.parse(userStr[1]) : null,
        dark: dark[1] === 'true',
        lang: (lang[1] as Lang) || 'ru',
      });
    } catch { /* ignore */ }
  },
}));
