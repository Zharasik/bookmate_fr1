const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

// Store uploads in /uploads folder
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    cb(ok ? null : new Error('Only images allowed'), ok);
  },
});

// ─── UPLOAD PHOTO FOR VENUE ──────────────────────────
router.post('/venue/:venueId', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const { rows } = await pool.query(
      `INSERT INTO venue_photos (venue_id, user_id, url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.params.venueId, req.userId, url]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Upload photo error:', err);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

// ─── UPLOAD AVATAR ───────────────────────────────────
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });

    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_url=$1 WHERE id=$2', [url, req.userId]);

    res.json({ avatar_url: url });
  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

module.exports = router;
