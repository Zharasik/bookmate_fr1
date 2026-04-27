require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Слишком много попыток. Попробуйте через 15 минут.' } });
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/services', require('./routes/services'));
app.use('/api/masters', require('./routes/masters'));
app.use('/api/promotions', require('./routes/promotions'));
app.use('/api/business', require('./routes/business'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'BookMate API', version: '2.0.0', time: new Date().toISOString() });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => console.log(`BookMate API v2 running on port ${PORT}`));
