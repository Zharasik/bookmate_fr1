import { API_URL } from '../constants/api';
import { useStore } from '../hooks/useStore';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = useStore.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  let data: any;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);
  return data as T;
}

export const api = {
  register: (email: string, password: string, name: string, phone?: string, role?: string) =>
    request<{ userId: string; email: string; message: string; dev_code?: string }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, name, phone, role }),
    }),
  verifyEmail: (userId: string, code: string) =>
    request<{ token: string; user: any }>('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ userId, code }) }),
  resendVerification: (userId: string) =>
    request<{ message: string; dev_code?: string }>('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ userId }) }),
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request<any>('/api/auth/me'),
  updateProfile: (data: { name?: string; phone?: string; avatar_url?: string }) =>
    request<any>('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<any>('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  getVenues: (category?: string, search?: string) => {
    const p = new URLSearchParams();
    if (category && category !== 'All') p.set('category', category);
    if (search) p.set('search', search);
    const qs = p.toString();
    return request<any[]>(`/api/venues${qs ? '?' + qs : ''}`);
  },
  getVenue: (id: string) => request<any>(`/api/venues/${id}`),
  getVenuePhotos: (id: string) => request<any[]>(`/api/venues/${id}/photos`),
  getVenueSlots: (id: string) => request<any[]>(`/api/venues/${id}/slots`),
  getCategories: () => request<string[]>('/api/venues/meta/categories'),
  // Returns { slots: [{...booked_ranges}], venue_ranges: [{start,end}] }
  getSlotAvailability: (venueId: string, date: string) =>
    request<{ slots: any[]; venue_ranges: { start: string; end: string }[] }>(
      `/api/bookings/availability/${venueId}?date=${date}`
    ),

  getBookings: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<any[]>(`/api/bookings${qs}`);
  },
  createBooking: (data: { venue_id: string; slot_id?: string; date: string; time: string; duration: number; guests: number; notes?: string }) =>
    request<any>('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id: string) => request<any>(`/api/bookings/${id}/cancel`, { method: 'PATCH' }),
  clearBookingHistory: () => request<{ deleted: number }>('/api/bookings/history', { method: 'DELETE' }),

  getReviews: (venueId: string) => request<any[]>(`/api/reviews/venue/${venueId}`),
  postReview: (data: { venue_id: string; rating: number; comment: string }) =>
    request<any>('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),

  getNotifications: () => request<any[]>('/api/notifications'),
  markRead: (id: string) => request<any>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<any>('/api/notifications/read-all', { method: 'PATCH' }),

  getFavorites: () => request<any[]>('/api/favorites'),
  toggleFavorite: (venue_id: string) =>
    request<{ favorited: boolean }>('/api/favorites/toggle', { method: 'POST', body: JSON.stringify({ venue_id }) }),
  checkFavorite: (venueId: string) => request<{ favorited: boolean }>(`/api/favorites/check/${venueId}`),

  getServices: (venueId: string) => request<any[]>(`/api/services/venue/${venueId}`),
  getMasters: (venueId: string) => request<any[]>(`/api/masters/venue/${venueId}`),
  getPromotions: (venueId?: string) =>
    venueId ? request<any[]>(`/api/promotions/venue/${venueId}`) : request<any[]>('/api/promotions'),

  // Business applications
  submitApplication: (data: { business_name: string; category: string; location: string; description?: string; phone?: string }) =>
    request<any>('/api/applications', { method: 'POST', body: JSON.stringify(data) }),
  getMyApplication: () => request<any>('/api/applications/my'),

  business: {
    getStats: () => request<any>('/api/business/stats'),
    getVenues: () => request<any[]>('/api/business/venues'),
    createVenue: (data: any) => request<any>('/api/business/venues', { method: 'POST', body: JSON.stringify(data) }),
    updateVenue: (id: string, data: any) => request<any>(`/api/business/venues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getSlots: (venueId: string) => request<any[]>(`/api/business/venues/${venueId}/slots`),
    createSlot: (venueId: string, data: any) => request<any>(`/api/business/venues/${venueId}/slots`, { method: 'POST', body: JSON.stringify(data) }),
    updateSlot: (slotId: string, data: any) => request<any>(`/api/business/slots/${slotId}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteSlot: (slotId: string) => request<any>(`/api/business/slots/${slotId}`, { method: 'DELETE' }),
    getBookings: (params?: { status?: string; venue_id?: string; date?: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return request<any[]>(`/api/business/bookings${qs ? '?' + qs : ''}`);
    },
    confirmBooking: (id: string) => request<any>(`/api/business/bookings/${id}/confirm`, { method: 'PATCH' }),
    cancelBooking: (id: string) => request<any>(`/api/business/bookings/${id}/cancel`, { method: 'PATCH' }),
    completeBooking: (id: string) => request<any>(`/api/business/bookings/${id}/complete`, { method: 'PATCH' }),
    rateClient: (bookingId: string, data: { rating: number; comment?: string }) =>
      request<any>(`/api/business/bookings/${bookingId}/rate-client`, { method: 'POST', body: JSON.stringify(data) }),
  },

  uploadVenuePhoto: async (venueId: string, uri: string) => {
    const token = useStore.getState().token;
    const form = new FormData();
    form.append('photo', { uri, name: 'photo.jpg', type: 'image/jpeg' } as any);
    const res = await fetch(`${API_URL}/api/photos/venue/${venueId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    return res.json();
  },
  uploadAvatar: async (uri: string) => {
    const token = useStore.getState().token;
    const form = new FormData();
    form.append('avatar', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
    const res = await fetch(`${API_URL}/api/photos/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    return res.json();
  },
};
