const { Router } = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

router.post('/', auth, async (req, res) => {
  const client = await pool.connect();
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

    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO business_applications (user_id, business_name, category, location, description, phone, status)
       VALUES ($1,$2,$3,$4,$5,$6,'approved') RETURNING *`,
      [req.userId, business_name, category, location, description || null, phone || null]
    );

    await client.query("UPDATE users SET role='business_owner' WHERE id=$1", [req.userId]);

    const venueRes = await client.query(
      `INSERT INTO venues (owner_id, name, category, location, description, phone, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
      [req.userId, business_name, category, location, description || null, phone || null]
    );

    await client.query('COMMIT');

    pool.query(
      `INSERT INTO notifications (user_id,type,title,message) VALUES ($1,'offer','Бизнес зарегистрирован!',$2)`,
      [req.userId, `Ваш бизнес "${business_name}" успешно зарегистрирован. Войдите в бизнес-панель для управления.`]
    ).catch(console.error);

    res.status(201).json({ ...rows[0], venue_id: venueRes.rows[0].id });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  } finally {
    client.release();
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
