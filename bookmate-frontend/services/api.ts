import { API_URL } from '../constants/api';
import { useStore } from '../hooks/useStore';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = useStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера');
  return data as T;
}

// ─── Auth ────────────────────────────────────────────
export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  getMe: () => request<any>('/api/auth/me'),

  updateProfile: (data: { name?: string; phone?: string; avatar_url?: string }) =>
    request<any>('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  // ─── Venues ──────────────────────────────────────
  getVenues: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.set('category', category);
    if (search) params.set('search', search);
    return request<any[]>(`/api/venues?${params}`);
  },

  getVenue: (id: string) => request<any>(`/api/venues/${id}`),

  getVenuePhotos: (id: string) => request<any[]>(`/api/venues/${id}/photos`),

  getCategories: () => request<string[]>('/api/venues/meta/categories'),

  // ─── Bookings ────────────────────────────────────
  getBookings: () => request<any[]>('/api/bookings'),

  createBooking: (data: { venue_id: string; date: string; time: string; guests: number }) =>
    request<any>('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),

  cancelBooking: (id: string) =>
    request<any>(`/api/bookings/${id}/cancel`, { method: 'PATCH' }),

  // ─── Reviews ─────────────────────────────────────
  getReviews: (venueId: string) => request<any[]>(`/api/reviews/venue/${venueId}`),

  postReview: (data: { venue_id: string; rating: number; comment: string }) =>
    request<any>('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Notifications ───────────────────────────────
  getNotifications: () => request<any[]>('/api/notifications'),

  markRead: (id: string) =>
    request<any>(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    request<any>('/api/notifications/read-all', { method: 'PATCH' }),

  // ─── Favorites ───────────────────────────────────
  getFavorites: () => request<any[]>('/api/favorites'),

  toggleFavorite: (venue_id: string) =>
    request<{ favorited: boolean }>('/api/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ venue_id }),
    }),

  checkFavorite: (venueId: string) =>
    request<{ favorited: boolean }>(`/api/favorites/check/${venueId}`),

  // ─── Services (public) ─────────────────────────────
  getServices: (venueId: string) =>
    request<any[]>(`/api/services/venue/${venueId}`),

  // ─── Masters (public) ──────────────────────────────
  getMasters: (venueId: string) =>
    request<any[]>(`/api/masters/venue/${venueId}`),

  // ─── Promotions (public) ───────────────────────────
  getPromotions: (venueId?: string) =>
    venueId
      ? request<any[]>(`/api/promotions/venue/${venueId}`)
      : request<any[]>('/api/promotions'),

  // ─── Photos ──────────────────────────────────────
  uploadVenuePhoto: async (venueId: string, uri: string) => {
    const token = useStore.getState().token;
    const form = new FormData();
    form.append('photo', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    const res = await fetch(`${API_URL}/api/photos/venue/${venueId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return res.json();
  },

  uploadAvatar: async (uri: string) => {
    const token = useStore.getState().token;
    const form = new FormData();
    form.append('avatar', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
    const res = await fetch(`${API_URL}/api/photos/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return res.json();
  },
};
