const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { USER_ROLES } = require('../utils/auth');

const router = Router();

router.use(auth, roleCheck(USER_ROLES.BUSINESS, USER_ROLES.ADMIN));

router.get('/dashboard', async (req, res) => {
  try {
    const [venues, services, promotions, upcomingBookings] = await Promise.all([
      pool.query('SELECT count(*) FROM venues WHERE is_active = true'),
      pool.query('SELECT count(*) FROM services WHERE is_active = true'),
      pool.query('SELECT count(*) FROM promotions WHERE is_active = true'),
      pool.query("SELECT count(*) FROM bookings WHERE status = 'upcoming'"),
    ]);

    res.json({
      account: req.user,
      stats: {
        activeVenues: Number(venues.rows[0].count),
        activeServices: Number(services.rows[0].count),
        activePromotions: Number(promotions.rows[0].count),
        upcomingBookings: Number(upcomingBookings.rows[0].count),
      },
    });
  } catch (err) {
    console.error('Business dashboard error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
