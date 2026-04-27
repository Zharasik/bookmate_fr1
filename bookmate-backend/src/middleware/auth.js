const pool = require('../db/pool');
const { verifyAccessToken } = require('../utils/auth');

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = verifyAccessToken(token);
    const userId = payload.sub || payload.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Некорректный токен' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, name, avatar_url, phone, role, created_at FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь для токена не найден' });
    }

    req.auth = payload;
    req.user = rows[0];
    req.userId = rows[0].id;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Неверный или истекший токен' });
  }
}

module.exports = auth;
