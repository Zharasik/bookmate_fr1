const { Pool } = require('pg');
require('dotenv').config();

const connStr = process.env.DATABASE_URL || '';
const useSSL = connStr.includes('neon.tech') || connStr.includes('sslmode=require');

const pool = new Pool({
  connectionString: connStr,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

module.exports = pool;