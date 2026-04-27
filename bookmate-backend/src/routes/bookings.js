const { Router } = require("express");
const pool = require("../db/pool");
const auth = require("../middleware/auth");

const router = Router();

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(min) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutes(timeStr, mins) {
  return minToTime(timeToMin(timeStr) + mins);
}

// GET /api/bookings — user's own bookings
router.get("/", auth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT b.*, v.name AS venue_name, v.image_url AS venue_image,
                v.location AS venue_location, v.category AS venue_category, vs.name AS slot_name, vs.duration AS slot_duration
               FROM bookings b
               JOIN venues v ON v.id = b.venue_id
               LEFT JOIN venue_slots vs ON vs.id = b.slot_id
               WHERE b.user_id = $1`;
    const params = [req.userId];
    if (status) {
      params.push(status);
      sql += ` AND b.status=$${params.length}`;
    }
    sql += ` ORDER BY CASE b.status WHEN 'confirmed' THEN 1 WHEN 'pending' THEN 2 WHEN 'completed' THEN 3 WHEN 'cancelled' THEN 4 ELSE 5 END, b.date ASC, b.time ASC`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// GET /api/bookings/availability/:venueId?date=YYYY-MM-DD
// Returns all active slots with their booked time ranges for the given date
router.get("/availability/:venueId", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "date обязателен" });

    // All active slots for this venue
    const slotsRes = await pool.query(
      `SELECT id, name, description, capacity, price, duration
       FROM venue_slots WHERE venue_id=$1 AND is_active=true ORDER BY name`,
      [req.params.venueId],
    );

    // All non-cancelled bookings for this venue+date
    const bookingsRes = await pool.query(
      `SELECT slot_id, time, end_time FROM bookings
       WHERE venue_id=$1 AND date=$2 AND status NOT IN ('cancelled')`,
      [req.params.venueId, date],
    );

    // Group booked ranges by slot_id
    const bookedBySlot = {};
    for (const b of bookingsRes.rows) {
      if (!b.slot_id) continue;
      if (!bookedBySlot[b.slot_id]) bookedBySlot[b.slot_id] = [];
      const endTime = b.end_time || addMinutes(b.time, 60);
      bookedBySlot[b.slot_id].push({ start: b.time, end: endTime });
    }

    // Venue-level ranges — bookings without a specific slot (or all bookings combined)
    const venueRanges = bookingsRes.rows.map((b) => ({
      start: b.time,
      end: b.end_time || addMinutes(b.time, 60),
    }));

    const result = {
      slots: slotsRes.rows.map((slot) => ({
        ...slot,
        booked_ranges: bookedBySlot[slot.id] || [],
      })),
      venue_ranges: venueRanges,
    };

    res.json(result);
  } catch (err) {
    console.error("Availability error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/bookings — create booking with overlap-based conflict detection
router.post("/", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { venue_id, slot_id, date, time, duration, guests, notes } = req.body;
    if (!venue_id || !date || !time)
      return res.status(400).json({ error: "venue_id, date и time обязательны" });

    // Reject past bookings
    const bookingDateTime = new Date(`${date}T${time}:00`);
    if (bookingDateTime <= new Date())
      return res.status(400).json({ error: "Нельзя забронировать на уже прошедшее время." });

    // Determine duration: from request → slot → default 60
    let bookingDuration = duration || 60;
    if (slot_id && !duration) {
      const slotDur = await pool.query("SELECT duration FROM venue_slots WHERE id=$1", [slot_id]);
      if (slotDur.rows[0]) bookingDuration = slotDur.rows[0].duration || 60;
    }
    const endTime = addMinutes(time, bookingDuration);

    await client.query("BEGIN");
    await client.query("SELECT id FROM venues WHERE id=$1 FOR UPDATE", [venue_id]);

    // Rule 1: user can't have overlapping booking at any venue
    const userConflict = await client.query(
      `SELECT b.id, v.name AS venue_name FROM bookings b
       JOIN venues v ON v.id = b.venue_id
       WHERE b.user_id=$1 AND b.date=$2 AND b.status NOT IN ('cancelled')
         AND b.time < $4 AND b.end_time > $3
       LIMIT 1`,
      [req.userId, date, time, endTime],
    );
    if (userConflict.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `У вас уже есть бронь на это время в "${userConflict.rows[0].venue_name}". Один человек не может находиться в двух местах одновременно.`,
        conflict: "user_time",
      });
    }

    // Rule 2: slot can't be double-booked (overlap)
    if (slot_id) {
      const slotConflict = await client.query(
        `SELECT id FROM bookings
         WHERE slot_id=$1 AND date=$2 AND status NOT IN ('cancelled')
           AND time < $4 AND end_time > $3
         LIMIT 1`,
        [slot_id, date, time, endTime],
      );
      if (slotConflict.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Это место уже занято на выбранное время. Выберите другой слот или время.",
          conflict: "slot_taken",
        });
      }
    }

    // Calculate price
    let totalPrice = 0;
    if (slot_id) {
      const slotRow = await client.query(
        "SELECT price, duration FROM venue_slots WHERE id=$1",
        [slot_id],
      );
      if (!slotRow.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Слот не найден" });
      }
      const slotPrice = slotRow.rows[0].price || 0;
      const slotDuration = slotRow.rows[0].duration || 60;
      // price is per-duration-unit; multiply by how many units booked
      const units = Math.round(bookingDuration / slotDuration);
      totalPrice = slotPrice * Math.max(1, units);
    }

    const { rows } = await client.query(
      `INSERT INTO bookings (user_id,venue_id,slot_id,date,time,end_time,guests,total_price,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9) RETURNING *`,
      [
        req.userId,
        venue_id,
        slot_id || null,
        date,
        time,
        endTime,
        guests || 1,
        totalPrice,
        notes || null,
      ],
    );
    await client.query("COMMIT");

    const venue = await pool.query("SELECT name FROM venues WHERE id=$1", [venue_id]);
    const venueName = venue.rows[0]?.name || "Заведение";
    pool
      .query(
        `INSERT INTO notifications (user_id,type,title,message) VALUES ($1,'booking','Бронь отправлена',$2)`,
        [
          req.userId,
          `Ваша бронь в "${venueName}" на ${date} в ${time}–${endTime} отправлена и ожидает подтверждения.`,
        ],
      )
      .catch(console.error);

    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
});

// DELETE /api/bookings/history — clear completed and cancelled bookings
router.delete("/history", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM bookings WHERE user_id=$1 AND status IN ('completed','cancelled') RETURNING id`,
      [req.userId],
    );
    res.json({ deleted: rows.length });
  } catch (err) {
    console.error("Clear history error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE bookings SET status='cancelled'
       WHERE id=$1 AND user_id=$2
         AND status NOT IN ('cancelled', 'completed')
       RETURNING *`,
      [req.params.id, req.userId],
    );
    if (!rows[0])
      return res.status(404).json({ error: "Бронь не найдена или уже завершена/отменена" });

    const booking = rows[0];
    const venue = await pool.query("SELECT name FROM venues WHERE id=$1", [booking.venue_id]);
    const venueName = venue.rows[0]?.name || "Заведение";
    pool
      .query(
        `INSERT INTO notifications (user_id,type,title,message) VALUES ($1,'booking','Бронь отменена',$2)`,
        [
          req.userId,
          `Ваша бронь в "${venueName}" на ${booking.date} в ${booking.time} отменена.`,
        ],
      )
      .catch(console.error);

    res.json(rows[0]);
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
