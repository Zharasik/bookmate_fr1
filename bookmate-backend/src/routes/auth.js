const { Router } = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const {
  DEFAULT_USER_ROLE,
  getRoleLandingPath,
  signAccessToken,
} = require('../utils/auth');
const {
  normalizeEmail,
  normalizePhone,
  sanitizeProfileName,
  validateEmail,
  validatePassword,
  validatePhone,
} = require('../utils/validation');

const router = Router();
const SALT_ROUNDS = 10;

function serializeUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url,
    phone: row.phone,
    role: row.role,
    created_at: row.created_at,
  };
}

function authPayload(user) {
  return {
    token: signAccessToken(user),
    user: serializeUser(user),
    redirectTo: getRoleLandingPath(user.role),
  };
}

function getUniqueViolationMessage(detail) {
  if (detail && detail.includes('email')) {
    return 'Пользователь с таким email уже существует';
  }

  if (detail && detail.includes('phone')) {
    return 'Пользователь с таким телефоном уже существует';
  }

  return 'Пользователь с такими данными уже существует';
}

async function ensureUniqueCredentials({ email, phone, excludeUserId = null }) {
  const checks = [];

  if (email) {
    checks.push(
      pool.query(
        `SELECT id FROM users
         WHERE lower(email) = lower($1)
           AND ($2::uuid IS NULL OR id <> $2::uuid)
         LIMIT 1`,
        [email, excludeUserId]
      ).then(({ rows }) => {
        if (rows.length > 0) {
          throw new Error('Пользователь с таким email уже существует');
        }
      })
    );
  }

  if (phone) {
    checks.push(
      pool.query(
        `SELECT id FROM users
         WHERE phone = $1
           AND ($2::uuid IS NULL OR id <> $2::uuid)
         LIMIT 1`,
        [phone, excludeUserId]
      ).then(({ rows }) => {
        if (rows.length > 0) {
          throw new Error('Пользователь с таким телефоном уже существует');
        }
      })
    );
  }

  await Promise.all(checks);
}

async function findUserByLoginIdentifier(identifier) {
  const email = normalizeEmail(identifier);
  if (email) {
    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url, phone, password_hash, role, created_at
       FROM users
       WHERE lower(email) = lower($1)
       LIMIT 1`,
      [email]
    );
    if (rows.length > 0) {
      return rows[0];
    }
  }

  const phone = normalizePhone(identifier);
  if (phone) {
    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url, phone, password_hash, role, created_at
       FROM users
       WHERE phone = $1
       LIMIT 1`,
      [phone]
    );
    if (rows.length > 0) {
      return rows[0];
    }
  }

  return null;
}

// ─── REGISTER ────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body || {};
    const emailResult = validateEmail(email);
    if (emailResult.error) {
      return res.status(400).json({ error: emailResult.error });
    }

    const passwordResult = validatePassword(password);
    if (passwordResult.error) {
      return res.status(400).json({ error: passwordResult.error });
    }

    const phoneResult = validatePhone(phone);
    if (phoneResult.error) {
      return res.status(400).json({ error: phoneResult.error });
    }

    await ensureUniqueCredentials({
      email: emailResult.value,
      phone: phoneResult.value,
    });

    const hash = await bcrypt.hash(passwordResult.value, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (email, phone, password_hash, name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, avatar_url, phone, role, created_at`,
      [
        emailResult.value,
        phoneResult.value,
        hash,
        sanitizeProfileName(name),
        DEFAULT_USER_ROLE,
      ]
    );

    const user = rows[0];
    res.status(201).json(authPayload(user));
  } catch (err) {
    if (err.message && err.message.includes('существует')) {
      return res.status(409).json({ error: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: getUniqueViolationMessage(err.detail) });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── LOGIN ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, phone, identifier, password } = req.body || {};
    const loginIdentifier = email || phone || identifier;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Email или телефон, а также пароль обязательны' });
    }

    const user = await findUserByLoginIdentifier(loginIdentifier);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email/телефон или пароль' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный email/телефон или пароль' });
    }

    res.json(authPayload(user));
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── GET CURRENT USER ────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      ...serializeUser(req.user),
      redirectTo: getRoleLandingPath(req.user.role),
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ─── UPDATE PROFILE ──────────────────────────────────
router.put('/me', auth, async (req, res) => {
  try {
    const { name, phone, avatar_url } = req.body || {};
    const phoneResult = validatePhone(phone);
    if (phoneResult.error) {
      return res.status(400).json({ error: phoneResult.error });
    }

    await ensureUniqueCredentials({
      phone: phoneResult.value,
      excludeUserId: req.userId,
    });

    const { rows } = await pool.query(
      `UPDATE users SET
         name = CASE WHEN $4 THEN $1 ELSE name END,
         phone = CASE WHEN $5 THEN $2 ELSE phone END,
         avatar_url = CASE WHEN $6 THEN $3 ELSE avatar_url END
       WHERE id = $7
       RETURNING id, email, name, avatar_url, phone, role, created_at`,
      [
        sanitizeProfileName(name),
        phoneResult.value,
        avatar_url ?? null,
        name !== undefined,
        phone !== undefined,
        avatar_url !== undefined,
        req.userId,
      ]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json(rows[0]);
  } catch (err) {
    if (err.message && err.message.includes('существует')) {
      return res.status(409).json({ error: err.message });
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: getUniqueViolationMessage(err.detail) });
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
