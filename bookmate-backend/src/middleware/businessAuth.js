const jwt = require('jsonwebtoken');

function businessAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'business_owner' && payload.role !== 'admin') {
      return res.status(403).json({ error: 'Доступ только для владельцев бизнеса' });
    }
    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ error: 'Неверный или истекший токен' });
  }
}

module.exports = businessAuth;
