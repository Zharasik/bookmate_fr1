const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

router.post('/', auth, async (req, res) => {
  try {
    const { business_name, category, location, description, phone } = req.body;
    if (!business_name || !category || !location)
      return res.status(400).json({ error: 'Название, категория и адрес обязательны' });

    const existing = await pool.query(
      `SELECT id, status FROM business_applications WHERE user_id=$1 AND status IN ('pending','approved') LIMIT 1`,
      [req.userId]
    );
    if (existing.rows.length > 0) {
      const s = existing.rows[0].status;
      return res.status(409).json({
        error: s === 'approved'
          ? 'Вы уже являетесь владельцем бизнеса.'
          : 'У вас уже есть активная заявка на рассмотрении.',
        status: s,
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO business_applications (user_id, business_name, category, location, description, phone, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [req.userId, business_name, category, location, description || null, phone || null]
    );

    pool.query(
      `INSERT INTO notifications (user_id,type,title,message) VALUES ($1,'info','Заявка отправлена',$2)`,
      [req.userId, `Ваша заявка на "${business_name}" принята и ожидает рассмотрения администратором.`]
    ).catch(console.error);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

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
