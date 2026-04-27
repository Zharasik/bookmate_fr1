const auth = require('./auth');
const roleCheck = require('./roleCheck');
const { USER_ROLES } = require('../utils/auth');

async function adminAuth(req, res, next) {
  auth(req, res, (authError) => {
    if (authError) {
      return next(authError);
    }

    return roleCheck(USER_ROLES.ADMIN)(req, res, next);
  });
}

module.exports = adminAuth;
