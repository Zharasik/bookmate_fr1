export interface Venue {
  id: string;
  name: string;
  category: string;
  location: string;
  description: string;
  rating: number;
  review_count: number;
  image_url: string | null;
  is_active: boolean;
  slot_count: number;
  phone?: string | null;
  open_time?: string | null;
  close_time?: string | null;
}

export interface VenuePhoto {
  id: string;
  venue_id: string;
  url: string;
  is_primary: boolean;
  created_at: string;
  user_id?: string | null;
  uploader_name?: string | null;
}

export interface Slot {
  id: string;
  venue_id: string;
  name: string;
  capacity: number;
  price_per_hour: number;
  is_active: boolean;
  image_url?: string | null;
  description?: string | null;
}

export interface SlotAvailability {
  slots: Array<{
    slot_id: string;
    booked_ranges: Array<{ start: string; end: string }>;
  }>;
  venue_ranges: Array<{ start: string; end: string }>;
}

export interface Booking {
  id: string;
  venue_id: string;
  venue_name: string;
  venue_image: string | null;
  venue_location: string;
  slot_name: string | null;
  date: string;
  time: string;
  end_date?: string | null;
  end_time: string | null;
  duration: number;
  guests: number;
  total_price: number;
  status: string;
  service_names?: string[];
  notes?: string | null;
  client_rating_given?: number | null;
}

export interface Review {
  id: string;
  venue_id: string;
  user_id: string;
  rating: number;
  comment: string;
  photo_url?: string | null;
  created_at: string;
  user_name?: string | null;
  reasons?: string[];
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown> | null;
}

export interface Service {
  id: string;
  venue_id: string;
  name: string;
  price: number;
  duration?: number | null;
  description?: string | null;
}

export interface Master {
  id: string;
  venue_id: string;
  name: string;
  specialty?: string | null;
  photo_url?: string | null;
  is_active: boolean;
}

export interface Promotion {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  discount?: number | null;
  valid_until?: string | null;
}

export interface Favorite {
  id: string;
  venue_id: string;
  venue_name: string;
  venue_image: string | null;
  venue_location: string;
  venue_rating: number;
}

export interface Application {
  id: string;
  business_name: string;
  category: string;
  location: string;
  description?: string | null;
  phone?: string | null;
  status: string;
  created_at: string;
}

export interface BusinessStats {
  total_bookings: number;
  total_revenue: number;
  active_venues: number;
  pending_bookings: number;
}
