import { router } from 'expo-router';
import { API_URL } from '../constants/api';
import { useStore } from '../hooks/useStore';
import { User } from '../hooks/useStore';
import {
  Venue, VenuePhoto, Slot, SlotAvailability,
  Booking, Review, Notification, Service, Master,
  Promotion, Favorite, Application, BusinessStats,
} from '../types/api';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = useStore.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  let data: unknown;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (res.status === 401) {
    useStore.getState().logout();
    router.replace('/auth/login');
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Ошибка ${res.status}`);
  return data as T;
}

async function requestForm<T>(path: string, method: string, formData: FormData): Promise<T> {
  const token = useStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { method, body: formData, headers });
  let data: unknown;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (res.status === 401) {
    useStore.getState().logout();
    router.replace('/auth/login');
  }
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Ошибка ${res.status}`);
  return data as T;
}

type VenueFormData = Omit<Venue, 'id' | 'rating' | 'review_count' | 'slot_count' | 'is_active'> & Record<string, unknown>;

function buildFormData(data: Record<string, unknown>, imageUri?: string | null): FormData {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v));
  });
  if (imageUri) {
    const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    fd.append('image', { uri: imageUri, name: `photo.${ext}`, type: mime } as unknown as Blob);
  }
  return fd;
}

async function uploadPhoto(endpoint: string, fieldName: string, uri: string, filename: string): Promise<VenuePhoto> {
  const token = useStore.getState().token;
  const form = new FormData();
  form.append(fieldName, { uri, name: filename, type: 'image/jpeg' } as unknown as Blob);
  const res = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token ?? ''}` },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Ошибка ${res.status}`);
  }
  return res.json() as Promise<VenuePhoto>;
}

export const api = {
  register: (email: string, password: string, name: string, phone?: string, role?: string) =>
    request<{ userId: string; email: string; message: string; dev_code?: string }>('/api/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password, name, phone, role }),
    }),
  verifyEmail: (userId: string, code: string) =>
    request<{ token: string; user: User }>('/api/auth/verify-email', { method: 'POST', body: JSON.stringify({ userId, code }) }),
  resendVerification: (userId: string) =>
    request<{ message: string; dev_code?: string }>('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ userId }) }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  forgotPassword: (email: string) =>
    request<{ message: string; dev_code?: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) }),
  getMe: () => request<User>('/api/auth/me'),
  updateProfile: (data: { name?: string; phone?: string; avatar_url?: string }) =>
    request<User>('/api/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

  getVenues: (category?: string, search?: string) => {
    const p = new URLSearchParams();
    if (category && category !== 'All') p.set('category', category);
    if (search) p.set('search', search);
    const qs = p.toString();
    return request<Venue[]>(`/api/venues${qs ? '?' + qs : ''}`);
  },
  getVenue: (id: string) => request<Venue>(`/api/venues/${id}`),
  getVenuePhotos: (id: string) => request<VenuePhoto[]>(`/api/venues/${id}/photos`),
  getVenueSlots: (id: string) => request<Slot[]>(`/api/venues/${id}/slots`),
  getCategories: () => request<string[]>('/api/venues/meta/categories'),
  getSlotAvailability: (venueId: string, date: string) =>
    request<SlotAvailability>(`/api/bookings/availability/${venueId}?date=${date}`),

  getBookings: (status?: string) => {
    const qs = status ? `?status=${status}` : '';
    return request<Booking[]>(`/api/bookings${qs}`);
  },
  createBooking: (data: { venue_id: string; slot_id?: string; service_ids?: string[]; date: string; time: string; duration: number; guests: number; notes?: string }) =>
    request<Booking>('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
  cancelBooking: (id: string) => request<Booking>(`/api/bookings/${id}/cancel`, { method: 'PATCH' }),
  clearBookingHistory: () => request<{ deleted: number }>('/api/bookings/history', { method: 'DELETE' }),

  getReviews: (venueId: string) => request<Review[]>(`/api/reviews/venue/${venueId}`),
  checkMyReview: (venueId: string) =>
    request<{ reviewed: boolean; review_id: string | null }>(`/api/reviews/my/${venueId}`),
  postReview: (data: { venue_id: string; rating: number; comment: string; photo_url?: string; reasons?: string[] }) =>
    request<Review>('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
  deleteMyReview: (id: string) => request<{ message: string }>(`/api/reviews/${id}`, { method: 'DELETE' }),
  appealReview: (reviewId: string, reason: string) =>
    request<{ message: string }>(`/api/reviews/${reviewId}/appeal`, { method: 'POST', body: JSON.stringify({ reason }) }),
  appealRating: (bookingId: string, reason: string) =>
    request<{ message: string }>(`/api/bookings/${bookingId}/appeal-rating`, { method: 'POST', body: JSON.stringify({ reason }) }),

  getNotifications: () => request<Notification[]>('/api/notifications'),
  markRead: (id: string) => request<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request<{ message: string }>('/api/notifications/read-all', { method: 'PATCH' }),

  getFavorites: () => request<Favorite[]>('/api/favorites'),
  toggleFavorite: (venue_id: string) =>
    request<{ favorited: boolean }>('/api/favorites/toggle', { method: 'POST', body: JSON.stringify({ venue_id }) }),
  checkFavorite: (venueId: string) => request<{ favorited: boolean }>(`/api/favorites/check/${venueId}`),

  getServices: (venueId: string) => request<Service[]>(`/api/services/venue/${venueId}`),
  getMasters: (venueId: string) => request<Master[]>(`/api/masters/venue/${venueId}`),
  getPromotions: (venueId?: string) =>
    venueId ? request<Promotion[]>(`/api/promotions/venue/${venueId}`) : request<Promotion[]>('/api/promotions'),

  submitApplication: (data: { business_name: string; category: string; location: string; description?: string; phone?: string }) =>
    request<Application>('/api/applications', { method: 'POST', body: JSON.stringify(data) }),
  getMyApplication: () => request<Application>('/api/applications/my'),

  business: {
    getStats: () => request<BusinessStats>('/api/business/stats'),
    getVenues: () => request<Venue[]>('/api/business/venues'),
    createVenue: (data: VenueFormData, imageUri?: string | null) =>
      requestForm<Venue>('/api/business/venues', 'POST', buildFormData(data, imageUri)),
    updateVenue: (id: string, data: VenueFormData, imageUri?: string | null) =>
      requestForm<Venue>(`/api/business/venues/${id}`, 'PUT', buildFormData(data, imageUri)),
    getSlots: (venueId: string) => request<Slot[]>(`/api/business/venues/${venueId}/slots`),
    createSlot: (venueId: string, data: Record<string, unknown>, imageUri?: string | null) =>
      requestForm<Slot>(`/api/business/venues/${venueId}/slots`, 'POST', buildFormData(data, imageUri)),
    updateSlot: (slotId: string, data: Record<string, unknown>, imageUri?: string | null) =>
      requestForm<Slot>(`/api/business/slots/${slotId}`, 'PUT', buildFormData(data, imageUri)),
    deleteSlot: (slotId: string) => request<{ message: string }>(`/api/business/slots/${slotId}`, { method: 'DELETE' }),
    getBookings: (params?: { status?: string; venue_id?: string; date?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<Booking[]>(`/api/business/bookings${qs ? '?' + qs : ''}`);
    },
    confirmBooking: (id: string) => request<Booking>(`/api/business/bookings/${id}/confirm`, { method: 'PATCH' }),
    cancelBooking: (id: string) => request<Booking>(`/api/business/bookings/${id}/cancel`, { method: 'PATCH' }),
    startBooking: (id: string) => request<Booking>(`/api/business/bookings/${id}/start`, { method: 'PATCH' }),
    completeBooking: (id: string) => request<Booking>(`/api/business/bookings/${id}/complete`, { method: 'PATCH' }),
    rateClient: (bookingId: string, data: { rating: number; comment?: string }) =>
      request<{ message: string }>(`/api/business/bookings/${bookingId}/rate-client`, { method: 'POST', body: JSON.stringify(data) }),
    getReviews: (venueId?: string) =>
      request<Review[]>(`/api/business/reviews${venueId ? '?venue_id=' + venueId : ''}`),
  },

  uploadReviewPhoto: (uri: string) => uploadPhoto('/api/photos/review', 'photo', uri, 'review.jpg'),
  uploadVenuePhoto: (venueId: string, uri: string) => uploadPhoto(`/api/photos/venue/${venueId}`, 'photo', uri, 'photo.jpg'),
  uploadAvatar: (uri: string) => uploadPhoto('/api/photos/avatar', 'avatar', uri, 'avatar.jpg'),
};
