const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ─── GET REVIEWS FOR A VENUE ─────────────────────────
router.get('/venue/:venueId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS user_name, u.avatar_url AS user_avatar
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.venue_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.venueId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── POST A REVIEW ───────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { venue_id, rating, comment } = req.body;
    if (!venue_id || !rating) {
      return res.status(400).json({ error: 'venue_id и rating обязательны' });
    }

    const { rows } = await pool.query(
      `INSERT INTO reviews (user_id, venue_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, venue_id, rating, comment || '']
    );

    // Recalculate venue rating
    await pool.query(
      `UPDATE venues SET
         rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE venue_id=$1),
         review_count = (SELECT COUNT(*) FROM reviews WHERE venue_id=$1)
       WHERE id = $1`,
      [venue_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Post review error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
