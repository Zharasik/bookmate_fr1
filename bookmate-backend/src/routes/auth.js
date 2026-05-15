const { Router } = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();
const SALT_ROUNDS = 12;

function signToken(userId, role) {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );
}

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

function createTransport() {
  if (!isSmtpConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendVerificationEmail(email, name, code) {
  if (isResendConfigured()) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'onboarding@resend.dev',
      to: email,
      subject: 'Подтвердите ваш email — BookMate',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:16px">
      <h2 style="color:#2563EB">BookMate</h2>
      <p>Привет, <strong>${name}</strong>! Ваш код подтверждения:</p>
      <div style="background:#2563EB;color:#fff;font-size:36px;font-weight:800;letter-spacing:12px;text-align:center;padding:20px;border-radius:12px;margin:24px 0">${code}</div>
      <p style="color:#9CA3AF;font-size:13px">Код действителен 15 минут.</p>
    </div>`,
    });
    if (error) throw new Error(error.message || 'Resend send failed');
    return true;
  }

  const transporter = createTransport();
  if (!transporter) {
    console.log(`[DEV] Verification code for ${email}: ${code}`);
    return false;
  }
  const info = await transporter.sendMail({
    from: `"BookMate" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Подтвердите ваш email — BookMate',
    html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:16px">
      <h2 style="color:#2563EB">BookMate</h2>
      <p>Привет, <strong>${name}</strong>! Ваш код подтверждения:</p>
      <div style="background:#2563EB;color:#fff;font-size:36px;font-weight:800;letter-spacing:12px;text-align:center;padding:20px;border-radius:12px;margin:24px 0">${code}</div>
      <p style="color:#9CA3AF;font-size:13px">Код действителен 15 минут.</p>
    </div>`,
  });
  return Boolean(info?.messageId);
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: 'Email, пароль и имя обязательны' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Пароль минимум 6 символов' });

    const userRole = ['user', 'business_owner'].includes(role) ? role : 'user';
    const normalizedEmail = email.trim().toLowerCase();

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [normalizedEmail]);
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    const pending = await pool.query(
      `INSERT INTO pending_registrations (email, password_hash, name, phone, role, code, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (email)
       DO UPDATE SET
         password_hash=EXCLUDED.password_hash,
         name=EXCLUDED.name,
         phone=EXCLUDED.phone,
         role=EXCLUDED.role,
         code=EXCLUDED.code,
         expires_at=EXCLUDED.expires_at,
         created_at=now()
       RETURNING id, email, name`,
      [normalizedEmail, hash, name.trim(), phone || null, userRole, code, expires]
    );
    const pendingUser = pending.rows[0];

    const mailConfigured = isResendConfigured() || isSmtpConfigured();
    let mailSent = false;
    try {
      mailSent = await sendVerificationEmail(pendingUser.email, pendingUser.name, code);
    } catch (e) {
      console.error('Mail error:', e.message);
    }

    res.status(201).json({
      message: (mailConfigured && mailSent)
        ? 'Проверьте email для подтверждения.'
        : 'Не удалось отправить email — код показан в приложении.',
      userId: pendingUser.id,
      email: pendingUser.email,
      dev_code: (mailConfigured && mailSent) ? null : code,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'userId и code обязательны' });

    const pending = await pool.query(
      `SELECT * FROM pending_registrations
       WHERE id=$1 AND code=$2 AND expires_at>now()
       LIMIT 1`,
      [userId, code]
    );
    if (pending.rows.length > 0) {
      const p = pending.rows[0];
      const created = await pool.query(
        `INSERT INTO users (email, password_hash, name, phone, role, email_verified, client_rating, rating_count)
         VALUES ($1,$2,$3,$4,$5,true,5.00,0)
         RETURNING id, email, name, avatar_url, phone, role, email_verified, client_rating`,
        [p.email, p.password_hash, p.name, p.phone, p.role]
      );
      await pool.query('DELETE FROM pending_registrations WHERE id=$1', [p.id]);
      const user = created.rows[0];
      return res.json({ token: signToken(user.id, user.role), user });
    }

    const { rows } = await pool.query(
      `SELECT * FROM email_verifications WHERE user_id=$1 AND code=$2 AND used=false AND expires_at>now() ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    );
    if (rows.length === 0) return res.status(400).json({ error: 'Неверный или истекший код' });

    await pool.query('UPDATE email_verifications SET used=true WHERE id=$1', [rows[0].id]);
    await pool.query('UPDATE users SET email_verified=true WHERE id=$1', [userId]);

    const { rows: userRows } = await pool.query(
      'SELECT id, email, name, avatar_url, phone, role, email_verified, client_rating FROM users WHERE id=$1',
      [userId]
    );
    const user = userRows[0];
    res.json({ token: signToken(user.id, user.role), user });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const { userId } = req.body;

    const pending = await pool.query(
      `SELECT id, email, name FROM pending_registrations WHERE id=$1`,
      [userId]
    );
    if (pending.rows[0]) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await pool.query(
        `UPDATE pending_registrations
         SET code=$1, expires_at=$2, created_at=now()
         WHERE id=$3`,
        [code, new Date(Date.now() + 15 * 60 * 1000), userId]
      );
      let mailSent = false;
      try {
        mailSent = await sendVerificationEmail(pending.rows[0].email, pending.rows[0].name, code);
      } catch (e) {
        console.error('Resend mail error:', e.message);
      }
      if (mailSent) return res.json({ message: 'Код отправлен' });
      return res.json({ message: 'Не удалось отправить email — код показан в приложении.', dev_code: code });
    }

    const { rows } = await pool.query('SELECT id, email, name, email_verified FROM users WHERE id=$1', [userId]);
    if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    if (rows[0].email_verified) return res.status(400).json({ error: 'Email уже подтверждён' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(`UPDATE email_verifications SET used=true WHERE user_id=$1 AND used=false`, [userId]);
    await pool.query(`INSERT INTO email_verifications (user_id, code, expires_at) VALUES ($1,$2,$3)`,
      [userId, code, new Date(Date.now() + 15 * 60 * 1000)]);
    let mailSent = false;
    try {
      mailSent = await sendVerificationEmail(rows[0].email, rows[0].name, code);
    } catch (e) {
      console.error('Resend mail error:', e.message);
    }
    if (mailSent) {
      return res.json({ message: 'Код отправлен' });
    }
    return res.json({ message: 'Не удалось отправить email — код показан в приложении.', dev_code: code });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url, phone, password_hash, role, email_verified, client_rating FROM users WHERE email=$1`,
      [email.toLowerCase()]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Неверный email или пароль' });

    const user = rows[0];
    if (!await bcrypt.compare(password, user.password_hash))
      return res.status(401).json({ error: 'Неверный email или пароль' });

    if (!user.email_verified)
      return res.status(403).json({ error: 'Email не подтверждён.', needsVerification: true, userId: user.id });

    delete user.password_hash;
    res.json({ token: signToken(user.id, user.role), user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email обязателен' });
    const normalizedEmail = email.trim().toLowerCase();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        code text NOT NULL,
        expires_at timestamptz NOT NULL,
        used boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      )
    `);

    const { rows } = await pool.query('SELECT id, name FROM users WHERE email=$1', [normalizedEmail]);
    if (!rows[0]) return res.json({ message: 'Если такой email зарегистрирован, код будет отправлен.' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await pool.query(
      `INSERT INTO password_resets (email, code, expires_at) VALUES ($1, $2, $3)`,
      [normalizedEmail, code, new Date(Date.now() + 15 * 60 * 1000)]
    );

    let mailSent = false;
    try { mailSent = await sendVerificationEmail(normalizedEmail, rows[0].name, code); }
    catch (e) { console.error('Forgot password mail error:', e.message); }

    res.json({
      message: 'Если такой email зарегистрирован, код будет отправлен.',
      dev_code: mailSent ? null : code,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Все поля обязательны' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Пароль минимум 8 символов' });

    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await pool.query(
      `SELECT id FROM password_resets
       WHERE email=$1 AND code=$2 AND used=false AND expires_at>now()
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, code]
    );
    if (!rows[0]) return res.status(400).json({ error: 'Неверный или истекший код' });

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash=$1 WHERE email=$2', [hash, normalizedEmail]);
    await pool.query('UPDATE password_resets SET used=true WHERE id=$1', [rows[0].id]);

    res.json({ message: 'Пароль успешно изменён' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url, phone, role, email_verified, client_rating, rating_count, created_at FROM users WHERE id=$1`,
      [req.userId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Не найден' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.put('/me', auth, async (req, res) => {
  try {
    const { name, phone, avatar_url } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE(NULLIF(TRIM($1),''),name), phone=COALESCE($2,phone), avatar_url=COALESCE($3,avatar_url)
       WHERE id=$4 RETURNING id, email, name, avatar_url, phone, role, email_verified, client_rating`,
      [name, phone, avatar_url, req.userId]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'Введите текущий и новый пароль (мин. 6 символов)' });
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.userId]);
    if (!await bcrypt.compare(currentPassword, rows[0].password_hash))
      return res.status(400).json({ error: 'Текущий пароль неверный' });
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await bcrypt.hash(newPassword, SALT_ROUNDS), req.userId]);
    res.json({ message: 'Пароль изменён' });
  } catch (err) { res.status(500).json({ error: 'Ошибка сервера' }); }
});

module.exports = router;
