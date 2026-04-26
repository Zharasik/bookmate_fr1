const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

async function adminAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT role FROM users WHERE id=$1', [payload.userId]);
    if (!rows[0] || rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Неверный или истекший токен' });
  }
}

module.exports = adminAuth;
