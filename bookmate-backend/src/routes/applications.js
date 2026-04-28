const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// POST /api/applications — submit application (any logged-in user)
router.post('/', auth, async (req, res) => {
  try {
    const { business_name, category, location, description, phone } = req.body;
    if (!business_name || !category || !location)
      return res.status(400).json({ error: 'Название, категория и адрес обязательны' });

    // Check if user already has pending/approved application
    const existing = await pool.query(
      `SELECT id, status FROM business_applications WHERE user_id=$1 AND status IN ('pending','approved') LIMIT 1`,
      [req.userId]
    );
    if (existing.rows.length > 0) {
      const s = existing.rows[0].status;
      return res.status(409).json({
        error: s === 'approved'
          ? 'Ваша заявка уже одобрена.'
          : 'У вас уже есть активная заявка на рассмотрении.',
        status: s,
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO business_applications (user_id, business_name, category, location, description, phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.userId, business_name, category, location, description || null, phone || null]
    );

    // Notify user
    pool.query(
      `INSERT INTO notifications (user_id,type,title,message) VALUES ($1,'offer','Заявка отправлена',$2)`,
      [req.userId, `Ваша заявка на открытие "${business_name}" отправлена и находится на рассмотрении.`]
    ).catch(console.error);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/applications/my — user checks own application status
router.get('/my', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM business_applications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [req.userId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
