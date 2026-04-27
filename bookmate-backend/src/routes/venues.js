const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

router.get('/meta/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT DISTINCT category FROM venues WHERE is_active=true ORDER BY category');
    res.json(['All', ...rows.map(r => r.category)]);
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/', async (req, res) => {
  try {
    const { category, search, limit = 50, offset = 0 } = req.query;
    let sql = `SELECT v.*, (SELECT COUNT(*) FROM venue_slots vs WHERE vs.venue_id=v.id AND vs.is_active=true) AS slot_count
               FROM venues v WHERE v.is_active=true`;
    const params = [];
    if (category && category !== 'All') { params.push(category); sql += ` AND v.category=$${params.length}`; }
    if (search) { params.push(`%${search}%`); sql += ` AND (v.name ILIKE $${params.length} OR v.category ILIKE $${params.length} OR v.description ILIKE $${params.length})`; }
    sql += ` ORDER BY v.rating DESC, v.review_count DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
    params.push(Number(limit), Number(offset));
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*, (SELECT COUNT(*) FROM venue_slots vs WHERE vs.venue_id=v.id AND vs.is_active=true) AS slot_count FROM venues v WHERE v.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Заведение не найдено' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/:id/photos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT vp.*, u.name AS uploader_name FROM venue_photos vp LEFT JOIN users u ON u.id=vp.user_id WHERE vp.venue_id=$1 ORDER BY vp.is_primary DESC, vp.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.get('/:id/slots', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM venue_slots WHERE venue_id=$1 AND is_active=true ORDER BY name ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
