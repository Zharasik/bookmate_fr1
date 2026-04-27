import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lang } from '../constants/i18n';

export type UserRole = 'user' | 'business_owner' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  email_verified: boolean;
  client_rating?: number;
}

interface AppState {
  token: string | null;
  user: User | null;
  dark: boolean;
  lang: Lang;
  setAuth: (token: string, user: User) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  hydrate: () => Promise<void>;
}

type SetFn = (partial: Partial<AppState> | ((s: AppState) => Partial<AppState>)) => void;
type GetFn = () => AppState;

export const useStore = create<AppState>((set: SetFn, get: GetFn) => ({
  token: null,
  user: null,
  dark: false,
  lang: 'ru' as Lang,

  setAuth: (token: string, user: User) => {
    set({ token, user });
    AsyncStorage.setItem('token', token);
    AsyncStorage.setItem('user', JSON.stringify(user));
  },

  updateUser: (partial: Partial<User>) => {
    const next = { ...get().user, ...partial } as User;
    set({ user: next });
    AsyncStorage.setItem('user', JSON.stringify(next));
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

  setLang: (lang: Lang) => {
    set({ lang });
    AsyncStorage.setItem('lang', lang);
  },

  hydrate: async () => {
    try {
      const results = await AsyncStorage.multiGet(['token', 'user', 'dark', 'lang']);
      set({
        token: results[0][1] || null,
        user: results[1][1] ? JSON.parse(results[1][1]) as User : null,
        dark: results[2][1] === 'true',
        lang: (results[3][1] as Lang) || 'ru',
      });
    } catch { /* ignore */ }
  },
}));
