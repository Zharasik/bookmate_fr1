const cron = require('node-cron');
const pool = require('../db/pool');

// Ensures the tracking table exists
async function ensureRemindersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_reminders_sent (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID NOT NULL,
      type       TEXT NOT NULL CHECK (type IN ('24h', '1h', '5min')),
      sent_at    TIMESTAMPTZ DEFAULT now(),
      UNIQUE(booking_id, type)
    )
  `);
}

async function sendReminders() {
  try {
    // Get all confirmed/pending upcoming bookings with user info and venue name
    const { rows: bookings } = await pool.query(`
      SELECT b.id, b.user_id, b.date, b.time, v.name AS venue_name
      FROM bookings b
      JOIN venues v ON v.id = b.venue_id
      WHERE b.status IN ('confirmed', 'pending')
        AND (b.date || ' ' || b.time)::timestamptz > now()
        AND (b.date || ' ' || b.time)::timestamptz <= now() + interval '25 hours'
    `);

    for (const booking of bookings) {
      const bookingTime = new Date(`${booking.date}T${booking.time}`);
      const now = new Date();
      const diffMs = bookingTime - now;
      const diffMin = diffMs / 60000;

      const remindersToSend = [];
      if (diffMin >= 23 * 60 && diffMin <= 25 * 60) remindersToSend.push('24h');
      if (diffMin >= 50 && diffMin <= 70) remindersToSend.push('1h');
      if (diffMin >= 3 && diffMin <= 7) remindersToSend.push('5min');

      for (const type of remindersToSend) {
        // Skip if already sent
        const { rows } = await pool.query(
          'SELECT 1 FROM booking_reminders_sent WHERE booking_id=$1 AND type=$2',
          [booking.id, type]
        );
        if (rows.length > 0) continue;

        const labels = { '24h': '24 часа', '1h': '1 час', '5min': '5 минут' };
        const message = `До вашей записи в "${booking.venue_name}" (${booking.time}) осталось ${labels[type]}.`;

        await pool.query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, 'booking', 'Напоминание о записи', $2)`,
          [booking.user_id, message]
        );

        await pool.query(
          'INSERT INTO booking_reminders_sent (booking_id, type) VALUES ($1, $2)',
          [booking.id, type]
        );

        console.log(`[Reminder] Sent ${type} reminder for booking ${booking.id}`);
      }
    }
  } catch (err) {
    console.error('[Reminder] Error:', err.message);
  }
}

function startReminderScheduler() {
  ensureRemindersTable().catch(console.error);

  // Runs every minute
  cron.schedule('* * * * *', sendReminders);
  console.log('[Reminder] Scheduler started — checking every minute');
}

module.exports = { startReminderScheduler };
