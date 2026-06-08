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

function toDateStr(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(`${toDateStr(date)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getEndDate(date, startTime, endTime) {
  return timeToMin(endTime) <= timeToMin(startTime) ? addDays(date, 1) : toDateStr(date);
}

function withEndDate(booking) {
  const endTime = booking.end_time || addMinutes(booking.time, 60);
  return {
    ...booking,
    end_time: endTime,
    end_date: booking.end_date ? toDateStr(booking.end_date) : getEndDate(booking.date, booking.time, endTime),
  };
}

// Compares two [start,end) time ranges that may belong to different dates and
// may wrap past midnight (e.g. start=23:00, end=02:00). Plain string/TIME
// comparison (`time < end AND end_time > start`) breaks for such overnight
// ranges, so overlap is computed numerically in minutes-since-midnight,
// shifting the second range by the day difference between the two dates.
function rangesOverlap(aDate, aStart, aEnd, bDate, bStart, bEnd) {
  const dayOffset = Math.round(
    (new Date(`${toDateStr(bDate)}T00:00:00Z`).getTime() -
      new Date(`${toDateStr(aDate)}T00:00:00Z`).getTime()) / 86400000,
  );
  let aStartMin = timeToMin(aStart);
  let aEndMin = timeToMin(aEnd);
  if (aEndMin <= aStartMin) aEndMin += 24 * 60;

  let bStartMin = timeToMin(bStart) + dayOffset * 24 * 60;
  let bEndMin = timeToMin(bEnd) + dayOffset * 24 * 60;
  if (bEndMin <= bStartMin) bEndMin += 24 * 60;

  return aStartMin < bEndMin && bStartMin < aEndMin;
}

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
    sql += ` ORDER BY CASE b.status WHEN 'in_progress' THEN 1 WHEN 'confirmed' THEN 2 WHEN 'pending' THEN 3 WHEN 'completed' THEN 4 WHEN 'cancelled' THEN 5 ELSE 6 END, b.date ASC, b.time ASC`;
    const { rows } = await pool.query(sql, params);
    res.json(rows.map(withEndDate));
  } catch (err) {
    console.error("Get bookings error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/availability/:venueId", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "date обязателен" });

    const slotsRes = await pool.query(
      `SELECT id, name, description, capacity, price, duration
       FROM venue_slots WHERE venue_id=$1 AND is_active=true ORDER BY name`,
      [req.params.venueId],
    );

    // Bookings are stored under their start date. An overnight booking (e.g.
    // 8 June 23:00 for 2h → ends 9 June 01:00) must show as "taken" on BOTH
    // pages it actually occupies: the evening portion on its start date, and
    // the early-morning portion (00:00–end) on the following date — not the
    // whole range crammed onto the start date. So we also pull in the previous
    // day's overnight bookings and split each range at the midnight boundary.
    const bookingsRes = await pool.query(
      `SELECT slot_id, date, time, end_time FROM bookings
       WHERE venue_id=$1 AND status NOT IN ('cancelled')
         AND date IN (($2::date - INTERVAL '1 day')::date, $2::date)`,
      [req.params.venueId, date],
    );

    const bookedBySlot = {};
    const venueRanges = [];
    for (const b of bookingsRes.rows) {
      const endTime = b.end_time || addMinutes(b.time, 60);
      const wraps = timeToMin(endTime) <= timeToMin(b.time);
      const isStartDate = toDateStr(b.date) === date;

      let range;
      if (isStartDate) {
        // Portion that falls on its own start date: full range, or up to
        // midnight if it spills into the next day.
        range = wraps ? { start: b.time, end: "24:00" } : { start: b.time, end: endTime };
      } else if (wraps) {
        // Spillover from the previous day's overnight booking: midnight to end.
        range = { start: "00:00", end: endTime };
      } else {
        continue;
      }

      if (b.slot_id) {
        if (!bookedBySlot[b.slot_id]) bookedBySlot[b.slot_id] = [];
        bookedBySlot[b.slot_id].push(range);
      }
      venueRanges.push(range);
    }

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

router.post("/", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { venue_id, slot_id, service_id, date, time, duration, guests, notes } = req.body;
    if (!venue_id || !date || !time)
      return res.status(400).json({ error: "venue_id, date и time обязательны" });

    const bookingDateTime = new Date(`${date}T${time}:00`);
    if (bookingDateTime <= new Date())
      return res.status(400).json({ error: "Нельзя забронировать на уже прошедшее время." });

    let bookingDuration = duration || 60;
    if (slot_id && !duration) {
      const slotDur = await pool.query("SELECT duration FROM venue_slots WHERE id=$1", [slot_id]);
      if (slotDur.rows[0]) bookingDuration = slotDur.rows[0].duration || 60;
    }
    const endTime = addMinutes(time, bookingDuration);
    const endDate = getEndDate(date, time, endTime);

    await client.query("BEGIN");
    await client.query("SELECT id FROM venues WHERE id=$1 FOR UPDATE", [venue_id]);

    // Overnight bookings (e.g. 23:00–02:00) store end_time < time, so plain
    // `time < $end AND end_time > $start` comparisons miss real overlaps.
    // Pull candidates from the surrounding dates and compare numerically instead.
    const userCandidates = await client.query(
      `SELECT b.id, b.date, b.time, b.end_time, v.name AS venue_name FROM bookings b
       JOIN venues v ON v.id = b.venue_id
       WHERE b.user_id=$1 AND b.status NOT IN ('cancelled')
         AND b.date BETWEEN $2::date - INTERVAL '1 day' AND $2::date + INTERVAL '1 day'`,
      [req.userId, date],
    );
    const userConflictRow = userCandidates.rows.find((b) =>
      rangesOverlap(date, time, endTime, b.date, b.time, b.end_time),
    );
    if (userConflictRow) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `У вас уже есть бронь на это время в "${userConflictRow.venue_name}". Один человек не может находиться в двух местах одновременно.`,
        conflict: "user_time",
      });
    }

    if (slot_id) {
      const slotCandidates = await client.query(
        `SELECT id, date, time, end_time FROM bookings
         WHERE slot_id=$1 AND status NOT IN ('cancelled')
           AND date BETWEEN $2::date - INTERVAL '1 day' AND $2::date + INTERVAL '1 day'`,
        [slot_id, date],
      );
      const slotConflictRow = slotCandidates.rows.find((b) =>
        rangesOverlap(date, time, endTime, b.date, b.time, b.end_time),
      );
      if (slotConflictRow) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Это место уже занято на выбранное время. Выберите другой слот или время.",
          conflict: "slot_taken",
        });
      }
    }

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
      const units = Math.round(bookingDuration / slotDuration);
      totalPrice = slotPrice * Math.max(1, units);
    }

    if (service_id && totalPrice === 0) {
      const svcRow = await client.query(
        "SELECT price, duration FROM services WHERE id=$1 AND is_active=true",
        [service_id],
      );
      if (svcRow.rows[0]) {
        const svcDur = svcRow.rows[0].duration || 60;
        const units = Math.max(1, Math.round(bookingDuration / svcDur));
        totalPrice = (svcRow.rows[0].price || 0) * units;
      }
    }

    const { rows } = await client.query(
      `INSERT INTO bookings (user_id,venue_id,slot_id,service_id,date,time,end_date,end_time,guests,total_price,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11) RETURNING *`,
      [
        req.userId,
        venue_id,
        slot_id || null,
        service_id || null,
        date,
        time,
        endDate,
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

    res.status(201).json(withEndDate(rows[0]));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Create booking error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
});

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

    res.json(withEndDate(rows[0]));
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post('/:id/appeal-rating', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    const bk = await pool.query(
      `SELECT id, client_rating_given FROM bookings WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.userId]
    );
    if (!bk.rows[0]) return res.status(404).json({ error: 'Бронь не найдена' });
    if (!bk.rows[0].client_rating_given) return res.status(400).json({ error: 'На эту бронь оценка не выставлена' });

    const dup = await pool.query(
      `SELECT id FROM review_appeals WHERE booking_id=$1 AND reporter_id=$2 AND status='pending' LIMIT 1`,
      [req.params.id, req.userId]
    );
    if (dup.rows.length > 0) return res.status(409).json({ error: 'Вы уже отправили жалобу на эту оценку.' });

    await pool.query(
      `INSERT INTO review_appeals (type, booking_id, reporter_id, reason)
       VALUES ('client_rating',$1,$2,$3)`,
      [req.params.id, req.userId, reason || null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Appeal rating error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
