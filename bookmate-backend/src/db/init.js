const pool = require('./pool');
require('dotenv').config();

const SQL = `
-- ═══════════════════════════════════════════════════════
-- USERS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  phone         TEXT,
  role          TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- VENUES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  location    TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  price_range TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  amenities   TEXT[] DEFAULT '{}',
  rating      NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  open_time   TEXT DEFAULT '10:00',
  close_time  TEXT DEFAULT '02:00',
  phone       TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- BOOKINGS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bookings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id   UUID REFERENCES venues(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  time       TEXT NOT NULL,
  guests     INTEGER DEFAULT 1,
  status     TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- REVIEWS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id   UUID REFERENCES venues(id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('booking','offer','review','venue')),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  read       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- FAVORITES
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS favorites (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
  UNIQUE(user_id, venue_id)
);

-- ═══════════════════════════════════════════════════════
-- VENUE PHOTOS (user-uploaded)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS venue_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   UUID REFERENCES venues(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- SERVICES (what each venue offers — e.g. "VIP Table 1hr")
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID REFERENCES venues(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  price       INTEGER DEFAULT 0,
  duration    INTEGER DEFAULT 60,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- MASTERS / STAFF
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS masters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID REFERENCES venues(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT DEFAULT '',
  bio         TEXT,
  avatar_url  TEXT,
  phone       TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════
-- PROMOTIONS / OFFERS
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS promotions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID REFERENCES venues(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  discount    INTEGER DEFAULT 0,
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Add role column to existing users if not present
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Add new columns to venues if migrating
DO $$ BEGIN
  ALTER TABLE venues ADD COLUMN IF NOT EXISTS open_time TEXT DEFAULT '10:00';
  ALTER TABLE venues ADD COLUMN IF NOT EXISTS close_time TEXT DEFAULT '02:00';
  ALTER TABLE venues ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;

const SEED_VENUES = `
INSERT INTO venues (name, category, location, description, image_url, price_range, latitude, longitude, amenities, rating, review_count)
VALUES
  ('Elite Billiards Club', 'Billiards', 'Downtown', 'Premium billiards club with professional tables and comfortable atmosphere. Perfect for casual games and tournaments.', 'https://images.unsplash.com/photo-1575425186775-b8de9a427e67?w=800&auto=format&fit=crop', '₸₸₸', 43.2389, 76.8897, ARRAY['Free WiFi','Bar','Parking','Air Conditioned'], 4.8, 128),
  ('Strike Zone Bowling', 'Bowling', 'West End', 'Modern bowling center with 16 lanes, cosmic bowling, and a great snack bar. Family-friendly environment.', 'https://images.unsplash.com/photo-1538511051852-73f9c6ac587b?w=800&auto=format&fit=crop', '₸₸', 43.252, 76.875, ARRAY['16 Lanes','Arcade Games','Cafe','Pro Shop'], 4.6, 95),
  ('Neon Arcade Gaming', 'Gaming', 'Midtown', 'State-of-the-art gaming lounge with latest consoles, VR stations, and retro arcade machines.', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop', '₸₸₸', 43.235, 76.91, ARRAY['VR Gaming','PC Gaming','Console Gaming','Tournaments'], 4.9, 210),
  ('Champions Sports Bar', 'Billiards', 'East Side', 'Sports bar featuring multiple pool tables, dart boards, and big screens for live sports events.', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop', '₸₸', 43.22, 76.92, ARRAY['Pool Tables','Darts','Sports TV','Full Bar'], 4.5, 73),
  ('Retro Arcade Almaty', 'Arcade', 'City Center', '80s and 90s themed arcade with classic pinball machines and retro video games.', 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=800&auto=format&fit=crop', '₸', 43.245, 76.88, ARRAY['Pinball','Retro Games','Prize Counter','Snack Bar'], 4.7, 156),
  ('Royal Bowling Center', 'Bowling', 'South Mall', 'Luxury bowling experience with VIP lanes, gourmet dining, and premium service.', 'https://images.unsplash.com/photo-1558618047-f4b51120375f?w=800&auto=format&fit=crop', '₸₸₸₸', 43.215, 76.865, ARRAY['VIP Lanes','Restaurant','Bar','Event Hosting'], 4.4, 89)
ON CONFLICT DO NOTHING;
`;

async function init() {
  const client = await pool.connect();
  try {
    console.log('Creating tables...');
    await client.query(SQL);
    console.log('Tables created.');

    // Only seed if empty
    const { rows } = await client.query('SELECT count(*) FROM venues');
    if (Number(rows[0].count) === 0) {
      console.log('Seeding venues...');
      await client.query(SEED_VENUES);
      console.log('Venues seeded.');
    } else {
      console.log('Venues already present — skipping seed.');
    }

    // Create default admin if no admins exist
    const admins = await client.query("SELECT count(*) FROM users WHERE role='admin'");
    if (Number(admins.rows[0].count) === 0) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin') ON CONFLICT (email) DO UPDATE SET role='admin'`,
        ['admin@bookmate.kz', hash, 'Admin']
      );
      console.log('Default admin created: admin@bookmate.kz / admin123');
    }

    console.log('Database initialised successfully!');
  } catch (err) {
    console.error('DB init error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

init();
