const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only images allowed'), ok);
  },
});

router.post('/venue/:venueId', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const { rows } = await pool.query(
      `INSERT INTO venue_photos (venue_id,user_id,url) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.venueId, req.userId, url]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Ошибка загрузки' }); }
});

router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    const { rows } = await pool.query(
      `UPDATE users SET avatar_url=$1 WHERE id=$2 RETURNING id, email, name, avatar_url, phone, role, client_rating, email_verified`,
      [url, req.userId]
    );
    res.json({ avatar_url: url, user: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Ошибка загрузки' }); }
});

module.exports = router;
