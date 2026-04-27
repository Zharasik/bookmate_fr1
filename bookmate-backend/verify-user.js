const pool = require('./src/db/pool');

pool.query(`
  UPDATE users SET email_verified = true
  WHERE email_verified = false
  RETURNING email, role
`).then(r => {
  if (r.rows.length === 0) {
    console.log('Не найдено неверифицированных пользователей.');
  } else {
    r.rows.forEach(row => console.log(`Верифицирован: ${row.email} (${row.role})`));
  }
  pool.end();
});
