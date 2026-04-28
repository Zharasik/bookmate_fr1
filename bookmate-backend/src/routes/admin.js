const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { USER_ROLES } = require('../utils/auth');
const { validateRole } = require('../utils/validation');

const router = Router();

// All routes require admin
router.use(auth, roleCheck(USER_ROLES.ADMIN));

// ═══════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════
router.get('/stats', async (_req, res) => {
  try {
    const [venues, users, bookings, reviews, services, masters] = await Promise.all([
      pool.query('SELECT count(*) FROM venues'),
      pool.query('SELECT count(*) FROM users'),
      pool.query('SELECT count(*) FROM bookings'),
      pool.query('SELECT count(*) FROM reviews'),
      pool.query('SELECT count(*) FROM services'),
      pool.query('SELECT count(*) FROM masters'),
    ]);
    const recent = await pool.query(
      `SELECT b.*, v.name AS venue_name, u.name AS user_name, u.email AS user_email
       FROM bookings b JOIN venues v ON v.id=b.venue_id JOIN users u ON u.id=b.user_id
       ORDER BY b.created_at DESC LIMIT 10`
    );
    res.json({
      venues: +venues.rows[0].count,
      users: +users.rows[0].count,
      bookings: +bookings.rows[0].count,
      reviews: +reviews.rows[0].count,
      services: +services.rows[0].count,
      masters: +masters.rows[0].count,
      recentBookings: recent.rows,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// VENUES CRUD
// ═══════════════════════════════════════════════════════
router.get('/venues', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM venues ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.post('/venues', async (req, res) => {
  try {
    const { name, category, location, description, image_url, price_range, latitude, longitude, amenities, open_time, close_time, phone } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO venues (name, category, location, description, image_url, price_range, latitude, longitude, amenities, open_time, close_time, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, category, location, description, image_url, price_range, latitude || 0, longitude || 0, amenities || [], open_time || '10:00', close_time || '02:00', phone]
    );
    // Notify all users about new venue
    const users = await pool.query('SELECT id FROM users');
    for (const u of users.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'venue', $2, $3)`,
        [u.id, 'Новое заведение!', `${name} теперь доступно в BookMate. Проверьте!`]
      );
    }
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.put('/venues/:id', async (req, res) => {
  try {
    const { name, category, location, description, image_url, price_range, latitude, longitude, amenities, open_time, close_time, phone, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE venues SET name=COALESCE($1,name), category=COALESCE($2,category), location=COALESCE($3,location),
       description=COALESCE($4,description), image_url=COALESCE($5,image_url), price_range=COALESCE($6,price_range),
       latitude=COALESCE($7,latitude), longitude=COALESCE($8,longitude), amenities=COALESCE($9,amenities),
       open_time=COALESCE($10,open_time), close_time=COALESCE($11,close_time), phone=COALESCE($12,phone),
       is_active=COALESCE($13,is_active)
       WHERE id=$14 RETURNING *`,
      [name, category, location, description, image_url, price_range, latitude, longitude, amenities, open_time, close_time, phone, is_active, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.delete('/venues/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM venues WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// SERVICES CRUD
// ═══════════════════════════════════════════════════════
router.get('/services', async (req, res) => {
  try {
    const { venue_id } = req.query;
    let sql = 'SELECT s.*, v.name AS venue_name FROM services s JOIN venues v ON v.id=s.venue_id';
    const params = [];
    if (venue_id) { params.push(venue_id); sql += ` WHERE s.venue_id=$1`; }
    sql += ' ORDER BY s.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.post('/services', async (req, res) => {
  try {
    const { venue_id, name, description, price, duration, is_active } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO services (venue_id, name, description, price, duration, is_active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [venue_id, name, description, price || 0, duration || 60, is_active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.put('/services/:id', async (req, res) => {
  try {
    const { name, description, price, duration, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE services SET name=COALESCE($1,name), description=COALESCE($2,description),
       price=COALESCE($3,price), duration=COALESCE($4,duration), is_active=COALESCE($5,is_active)
       WHERE id=$6 RETURNING *`,
      [name, description, price, duration, is_active, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.delete('/services/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM services WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// MASTERS / STAFF CRUD
// ═══════════════════════════════════════════════════════
router.get('/masters', async (req, res) => {
  try {
    const { venue_id } = req.query;
    let sql = 'SELECT m.*, v.name AS venue_name FROM masters m JOIN venues v ON v.id=m.venue_id';
    const params = [];
    if (venue_id) { params.push(venue_id); sql += ` WHERE m.venue_id=$1`; }
    sql += ' ORDER BY m.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.post('/masters', async (req, res) => {
  try {
    const { venue_id, name, role, bio, avatar_url, phone } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO masters (venue_id, name, role, bio, avatar_url, phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [venue_id, name, role || '', bio, avatar_url, phone]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.put('/masters/:id', async (req, res) => {
  try {
    const { name, role, bio, avatar_url, phone, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE masters SET name=COALESCE($1,name), role=COALESCE($2,role), bio=COALESCE($3,bio),
       avatar_url=COALESCE($4,avatar_url), phone=COALESCE($5,phone), is_active=COALESCE($6,is_active)
       WHERE id=$7 RETURNING *`,
      [name, role, bio, avatar_url, phone, is_active, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.delete('/masters/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM masters WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// PROMOTIONS CRUD
// ═══════════════════════════════════════════════════════
router.get('/promotions', async (req, res) => {
  try {
    const { venue_id } = req.query;
    let sql = 'SELECT p.*, v.name AS venue_name FROM promotions p JOIN venues v ON v.id=p.venue_id';
    const params = [];
    if (venue_id) { params.push(venue_id); sql += ` WHERE p.venue_id=$1`; }
    sql += ' ORDER BY p.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.post('/promotions', async (req, res) => {
  try {
    const { venue_id, title, description, discount, start_date, end_date } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO promotions (venue_id, title, description, discount, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [venue_id, title, description, discount || 0, start_date, end_date]
    );
    // Notify all users about the promotion
    const users = await pool.query('SELECT id FROM users');
    for (const u of users.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'offer', $2, $3)`,
        [u.id, title, `${description || ''} — скидка ${discount}%!`]
      );
    }
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.put('/promotions/:id', async (req, res) => {
  try {
    const { title, description, discount, start_date, end_date, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE promotions SET title=COALESCE($1,title), description=COALESCE($2,description),
       discount=COALESCE($3,discount), start_date=COALESCE($4,start_date),
       end_date=COALESCE($5,end_date), is_active=COALESCE($6,is_active)
       WHERE id=$7 RETURNING *`,
      [title, description, discount, start_date, end_date, is_active, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.delete('/promotions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM promotions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// PHOTOS MANAGEMENT
// ═══════════════════════════════════════════════════════
router.get('/photos', async (req, res) => {
  try {
    const { venue_id } = req.query;
    let sql = 'SELECT p.*, v.name AS venue_name FROM venue_photos p JOIN venues v ON v.id=p.venue_id';
    const params = [];
    if (venue_id) { params.push(venue_id); sql += ` WHERE p.venue_id=$1`; }
    sql += ' ORDER BY p.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.delete('/photos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM venue_photos WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// BOOKINGS MANAGEMENT
// ═══════════════════════════════════════════════════════
router.get('/bookings', async (req, res) => {
  try {
    const { status, venue_id } = req.query;
    let sql = `SELECT b.*, v.name AS venue_name, u.name AS user_name, u.email AS user_email,
                      vs.name AS slot_name
               FROM bookings b
               JOIN venues v ON v.id=b.venue_id
               JOIN users u ON u.id=b.user_id
               LEFT JOIN venue_slots vs ON vs.id=b.slot_id
               WHERE 1=1`;
    const params = [];
    if (status) { params.push(status); sql += ` AND b.status=$${params.length}`; }
    if (venue_id) { params.push(venue_id); sql += ` AND b.venue_id=$${params.length}`; }
    sql += ' ORDER BY b.created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.patch('/bookings/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await pool.query(
      'UPDATE bookings SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// REVIEWS MANAGEMENT
// ═══════════════════════════════════════════════════════
router.get('/reviews', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, v.name AS venue_name, u.name AS user_name
       FROM reviews r JOIN venues v ON v.id=r.venue_id JOIN users u ON u.id=r.user_id
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    // recalc venue rating after delete
    const review = await pool.query('SELECT venue_id FROM reviews WHERE id=$1', [req.params.id]);
    await pool.query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
    if (review.rows[0]) {
      const vid = review.rows[0].venue_id;
      await pool.query(
        `UPDATE venues SET
           rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews WHERE venue_id=$1), 0),
           review_count = (SELECT COUNT(*) FROM reviews WHERE venue_id=$1)
         WHERE id=$1`, [vid]
      );
    }
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// USERS MANAGEMENT
// ═══════════════════════════════════════════════════════
router.get('/users', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url, phone, role, email_verified,
              client_rating, rating_count, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body || {};
    const allowed = ['user', 'business_owner', 'admin'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ error: 'Недопустимая роль. Допустимо: user, business_owner, admin' });
    }
    const { rows } = await pool.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, email, name, role',
      [role, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Не найдено' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// ═══════════════════════════════════════════════════════
// SEND NOTIFICATION TO ALL USERS
// ═══════════════════════════════════════════════════════
router.post('/notify-all', async (req, res) => {
  try {
    const { type, title, message } = req.body;
    const users = await pool.query('SELECT id FROM users');
    for (const u of users.rows) {
      await pool.query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES ($1,$2,$3,$4)',
        [u.id, type || 'offer', title, message]
      );
    }
    res.json({ sent: users.rows.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

module.exports = router;
