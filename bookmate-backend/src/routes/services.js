const { Router } = require('express');
const pool = require('../db/pool');

const router = Router();

// GET services for a venue (public)
router.get('/venue/:venueId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM services WHERE venue_id=$1 AND is_active=true ORDER BY price ASC',
      [req.params.venueId]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Ошибка' }); }
});

module.exports = router;
