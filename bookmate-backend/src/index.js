require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Public API
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/venues', require('./routes/venues'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/services', require('./routes/services'));
app.use('/api/masters', require('./routes/masters'));
app.use('/api/promotions', require('./routes/promotions'));

// Admin API (requires role=admin)
app.use('/api/admin', require('./routes/admin'));
app.use('/api/business', require('./routes/business'));

// Serve Admin Panel
app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'BookMate API', version: '2.0.0' });
});

app.listen(PORT, () => {
  console.log(`BookMate API running on port ${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
