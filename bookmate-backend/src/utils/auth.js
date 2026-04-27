const jwt = require('jsonwebtoken');

const USER_ROLES = Object.freeze({
  USER: 'user',
  BUSINESS: 'business',
  ADMIN: 'admin',
});

const ALLOWED_USER_ROLES = Object.freeze(Object.values(USER_ROLES));
const DEFAULT_USER_ROLE = USER_ROLES.USER;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      userId: user.id,
      role: user.role,
      type: 'access',
    },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function getRoleLandingPath(role) {
  switch (role) {
    case USER_ROLES.ADMIN:
      return '/admin';
    case USER_ROLES.BUSINESS:
      return '/business';
    case USER_ROLES.USER:
    default:
      return '/(tabs)';
  }
}

module.exports = {
  USER_ROLES,
  ALLOWED_USER_ROLES,
  DEFAULT_USER_ROLE,
  signAccessToken,
  verifyAccessToken,
  getRoleLandingPath,
};
