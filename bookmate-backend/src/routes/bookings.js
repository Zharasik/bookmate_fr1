const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ─── GET MY BOOKINGS ─────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, v.name AS venue_name, v.image_url AS venue_image, v.location AS venue_location
       FROM bookings b
       JOIN venues v ON v.id = b.venue_id
       WHERE b.user_id = $1
       ORDER BY b.date DESC, b.time DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── CREATE BOOKING ──────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { venue_id, date, time, guests } = req.body;
    if (!venue_id || !date || !time) {
      return res.status(400).json({ error: 'venue_id, date и time обязательны' });
    }

    const { rows } = await pool.query(
      `INSERT INTO bookings (user_id, venue_id, date, time, guests)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.userId, venue_id, date, time, guests || 1]
    );

    // Create notification
    const venue = await pool.query('SELECT name FROM venues WHERE id=$1', [venue_id]);
    const venueName = venue.rows[0]?.name || 'Заведение';
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'booking', 'Бронь подтверждена', $2)`,
      [req.userId, `Ваша бронь в ${venueName} на ${date} в ${time} подтверждена.`]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── CANCEL BOOKING ──────────────────────────────────
router.patch('/:id/cancel', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE bookings SET status='cancelled'
       WHERE id=$1 AND user_id=$2
       RETURNING *`,
      [req.params.id, req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Бронь не найдена' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
