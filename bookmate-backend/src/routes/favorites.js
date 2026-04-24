const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// ─── GET MY FAVORITES ────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.* FROM favorites f
       JOIN venues v ON v.id = f.venue_id
       WHERE f.user_id = $1`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get favorites error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── TOGGLE FAVORITE ─────────────────────────────────
router.post('/toggle', auth, async (req, res) => {
  try {
    const { venue_id } = req.body;
    const existing = await pool.query(
      'SELECT id FROM favorites WHERE user_id=$1 AND venue_id=$2',
      [req.userId, venue_id]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM favorites WHERE user_id=$1 AND venue_id=$2', [req.userId, venue_id]);
      res.json({ favorited: false });
    } else {
      await pool.query('INSERT INTO favorites (user_id, venue_id) VALUES ($1, $2)', [req.userId, venue_id]);
      res.json({ favorited: true });
    }
  } catch (err) {
    console.error('Toggle favorite error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── CHECK IF FAVORITED ──────────────────────────────
router.get('/check/:venueId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM favorites WHERE user_id=$1 AND venue_id=$2',
      [req.userId, req.params.venueId]
    );
    res.json({ favorited: rows.length > 0 });
  } catch (err) {
    console.error('Check favorite error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
