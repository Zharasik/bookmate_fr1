const API_URL = 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('admin_token');
}

async function request(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || `Ошибка ${res.status}`);
  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  // Stats
  getStats: () => request('/api/admin/stats'),

  // Venues
  getVenues: () => request('/api/admin/venues'),
  createVenue: (data) => request('/api/admin/venues', { method: 'POST', body: JSON.stringify(data) }),
  updateVenue: (id, data) => request(`/api/admin/venues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteVenue: (id) => request(`/api/admin/venues/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: () => request('/api/admin/users'),
  updateUser: (id, data) => request(`/api/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),

  // Bookings
  getBookings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/admin/bookings${qs ? '?' + qs : ''}`);
  },
  updateBookingStatus: (id, status) =>
    request(`/api/admin/bookings/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Services
  getServices: (venue_id) => request(`/api/admin/services${venue_id ? '?venue_id=' + venue_id : ''}`),
  createService: (data) => request('/api/admin/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) => request(`/api/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id) => request(`/api/admin/services/${id}`, { method: 'DELETE' }),
};
