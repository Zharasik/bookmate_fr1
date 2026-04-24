const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

// ─── GET ALL VENUES (with optional category filter + search) ─
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT * FROM venues WHERE 1=1';
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR category ILIKE $${params.length})`;
    }

    sql += ' ORDER BY rating DESC';
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Venues list error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── GET SINGLE VENUE ────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM venues WHERE id=$1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Заведение не найдено' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Venue detail error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── GET VENUE PHOTOS ────────────────────────────────
router.get('/:id/photos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM venue_photos WHERE venue_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Venue photos error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── GET CATEGORIES ──────────────────────────────────
router.get('/meta/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT DISTINCT category FROM venues ORDER BY category');
    const cats = ['All', ...rows.map(r => r.category)];
    res.json(cats);
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
