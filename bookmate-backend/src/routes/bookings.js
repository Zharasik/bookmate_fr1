const { Router } = require("express");
const pool = require("../db/pool");
const auth = require("../middleware/auth");

const router = Router();

router.get("/", auth, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT b.*, v.name AS venue_name, v.image_url AS venue_image,
                v.location AS venue_location, v.category AS venue_category, vs.name AS slot_name
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

router.get("/availability/:venueId", async (req, res) => {
  try {
    const { date, time } = req.query;
    if (!date || !time)
      return res.status(400).json({ error: "date и time обязательны" });
    const { rows } = await pool.query(
      `SELECT vs.*, CASE WHEN b.id IS NOT NULL THEN true ELSE false END AS is_booked
       FROM venue_slots vs
       LEFT JOIN bookings b ON b.slot_id=vs.id AND b.date=$1 AND b.time=$2 AND b.status NOT IN ('cancelled')
       WHERE vs.venue_id=$3 AND vs.is_active=true ORDER BY vs.name`,
      [date, time, req.params.venueId],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Critical: conflict detection with transaction locking
router.post("/", auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { venue_id, slot_id, date, time, end_time, guests, notes } = req.body;
    if (!venue_id || !date || !time)
      return res
        .status(400)
        .json({ error: "venue_id, date и time обязательны" });

    await client.query("BEGIN");
    await client.query("SELECT id FROM venues WHERE id=$1 FOR UPDATE", [
      venue_id,
    ]);

    // Rule 1: user can't book two places at same time
    const userConflict = await client.query(
      `SELECT id FROM bookings WHERE user_id=$1 AND date=$2 AND time=$3 AND status NOT IN ('cancelled') LIMIT 1`,
      [req.userId, date, time],
    );
    if (userConflict.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `У вас уже есть бронь на ${date} в ${time}. Один человек не может находиться в двух местах одновременно.`,
        conflict: "user_time",
      });
    }

    // Rule 2: slot can't be double-booked
    if (slot_id) {
      const slotConflict = await client.query(
        `SELECT id FROM bookings WHERE slot_id=$1 AND date=$2 AND time=$3 AND status NOT IN ('cancelled') LIMIT 1`,
        [slot_id, date, time],
      );
      if (slotConflict.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error:
            "Это место уже занято на выбранное время. Выберите другой слот или время.",
          conflict: "slot_taken",
        });
      }
    }

    let totalPrice = 0;
    if (slot_id) {
      const slotRow = await client.query(
        "SELECT price FROM venue_slots WHERE id=$1",
        [slot_id],
      );
      if (!slotRow.rows[0]) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Слот не найден" });
      }
      totalPrice = slotRow.rows[0].price || 0;
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
        end_time || null,
        guests || 1,
        totalPrice,
        notes || null,
      ],
    );
    await client.query("COMMIT");

    const venue = await pool.query("SELECT name FROM venues WHERE id=$1", [
      venue_id,
    ]);
    const venueName = venue.rows[0]?.name || "Заведение";
    pool
      .query(
        `INSERT INTO notifications (user_id,type,title,message) VALUES ($1,'booking','Бронь отправлена',$2)`,
        [
          req.userId,
          `Ваша бронь в "${venueName}" на ${date} в ${time} отправлена и ожидает подтверждения.`,
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

router.patch("/:id/cancel", auth, async (req, res) => {
  try {
    // status NOT IN список включает старый 'upcoming' статус — он тоже должен отменяться
    const { rows } = await pool.query(
      `UPDATE bookings SET status='cancelled'
       WHERE id=$1 AND user_id=$2
         AND status NOT IN ('cancelled', 'completed')
       RETURNING *`,
      [req.params.id, req.userId],
    );
    if (!rows[0])
      return res
        .status(404)
        .json({ error: "Бронь не найдена или уже завершена/отменена" });

    const booking = rows[0];
    const venue = await pool.query("SELECT name FROM venues WHERE id=$1", [
      booking.venue_id,
    ]);
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
