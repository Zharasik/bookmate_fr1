const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

router.get('/venue/:venueId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM promotions WHERE venue_id=$1 AND is_active=true
       AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       ORDER BY discount DESC`,
      [req.params.venueId]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

// All active promotions (for home feed)
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, v.name AS venue_name, v.image_url AS venue_image
       FROM promotions p JOIN venues v ON v.id=p.venue_id
       WHERE p.is_active=true AND (p.end_date IS NULL OR p.end_date >= CURRENT_DATE)
       ORDER BY p.discount DESC LIMIT 20`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

module.exports = router;
