function roleCheck(...allowedRoles) {
  const normalizedRoles = allowedRoles.flat().filter(Boolean);

  if (normalizedRoles.length === 0) {
    throw new Error('roleCheck requires at least one role');
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    if (!normalizedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав для выполнения операции' });
    }

    next();
  };
}

module.exports = roleCheck;
