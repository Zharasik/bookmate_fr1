const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

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

router.get('/my/:venueId', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id FROM reviews WHERE user_id=$1 AND venue_id=$2 LIMIT 1`,
      [req.userId, req.params.venueId]
    );
    res.json({ reviewed: rows.length > 0, review_id: rows[0]?.id || null });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { venue_id, rating, comment, photo_url, bad_reason, reasons } = req.body;
    if (!venue_id || !rating) {
      return res.status(400).json({ error: 'venue_id и rating обязательны' });
    }
    const reasonsArr = Array.isArray(reasons) ? reasons.slice(0, 3) : (bad_reason ? [bad_reason] : []);

    const { rows } = await pool.query(
      `INSERT INTO reviews (user_id, venue_id, rating, comment, photo_url, bad_reason, reasons)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, venue_id, rating, comment || '', photo_url || null, reasonsArr[0] || null, reasonsArr]
    );

    await pool.query(
      `UPDATE venues SET
         rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE venue_id=$1),
         review_count = (SELECT COUNT(*) FROM reviews WHERE venue_id=$1)
       WHERE id = $1`,
      [venue_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Вы уже оставляли отзыв для этого заведения.' });
    }
    console.error('Post review error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/:id/appeal', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const rv = await pool.query('SELECT id FROM reviews WHERE id=$1', [req.params.id]);
    if (!rv.rows[0]) return res.status(404).json({ error: 'Отзыв не найден' });

    const dup = await pool.query(
      `SELECT id FROM review_appeals WHERE review_id=$1 AND reporter_id=$2 AND status='pending' LIMIT 1`,
      [req.params.id, req.userId]
    );
    if (dup.rows.length > 0) return res.status(409).json({ error: 'Вы уже отправили жалобу на этот отзыв.' });

    await pool.query(
      `INSERT INTO review_appeals (type, review_id, reporter_id, reason)
       VALUES ('venue_review',$1,$2,$3)`,
      [req.params.id, req.userId, reason || null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Appeal review error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const check = await pool.query(
      'SELECT venue_id FROM reviews WHERE id=$1 AND user_id=$2',
      [req.params.id, req.userId]
    );
    if (!check.rows[0]) return res.status(404).json({ error: 'Отзыв не найден' });
    const venue_id = check.rows[0].venue_id;

    await pool.query('DELETE FROM reviews WHERE id=$1', [req.params.id]);

    await pool.query(
      `UPDATE venues SET
         rating = COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews WHERE venue_id=$1), 0),
         review_count = (SELECT COUNT(*) FROM reviews WHERE venue_id=$1)
       WHERE id = $1`,
      [venue_id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
