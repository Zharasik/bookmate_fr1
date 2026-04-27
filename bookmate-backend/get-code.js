const pool = require('./src/db/pool');

pool.query(`
  SELECT id, email, name, code, expires_at
  FROM pending_registrations
  ORDER BY created_at DESC
  LIMIT 5
`).then(r => {
  if (r.rows.length === 0) {
    console.log('Нет pending регистраций.');
  } else {
    console.log('Pending регистрации:');
    r.rows.forEach(row => console.log(`  ${row.email} → код: ${row.code} (до ${row.expires_at})`));
  }
  pool.end();
});
