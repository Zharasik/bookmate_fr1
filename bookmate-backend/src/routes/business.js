const { Router } = require("express");
const pool = require("../db/pool");
const businessAuth = require("../middleware/businessAuth");

const router = Router();
router.use(businessAuth);

// ═══════════════════════════════════════════════════════
// MY VENUES
// ═══════════════════════════════════════════════════════
router.get("/venues", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*,
         (SELECT COUNT(*) FROM venue_slots vs WHERE vs.venue_id=v.id) AS slot_count,
         (SELECT COUNT(*) FROM bookings b WHERE b.venue_id=v.id AND b.status NOT IN ('cancelled')) AS booking_count
       FROM venues v
       WHERE v.owner_id = $1
       ORDER BY v.created_at DESC`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/venues", async (req, res) => {
  try {
    const {
      name,
      category,
      location,
      city,
      description,
      image_url,
      price_range,
      latitude,
      longitude,
      amenities,
      open_time,
      close_time,
      phone,
    } = req.body;
    if (!name || !category || !location) {
      return res
        .status(400)
        .json({ error: "Название, категория и адрес обязательны" });
    }
    const { rows } = await pool.query(
      `INSERT INTO venues
         (owner_id, name, category, location, city, description, image_url, price_range,
          latitude, longitude, amenities, open_time, close_time, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.userId,
        name,
        category,
        location,
        city || "Almaty",
        description,
        image_url,
        price_range,
        latitude || 0,
        longitude || 0,
        amenities || [],
        open_time || "09:00",
        close_time || "21:00",
        phone,
      ],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.put("/venues/:id", async (req, res) => {
  try {
    const {
      name,
      category,
      location,
      city,
      description,
      image_url,
      price_range,
      latitude,
      longitude,
      amenities,
      open_time,
      close_time,
      phone,
      is_active,
    } = req.body;

    const check = await pool.query(
      "SELECT id FROM venues WHERE id=$1 AND owner_id=$2",
      [req.params.id, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Заведение не найдено" });

    const { rows } = await pool.query(
      `UPDATE venues SET
         name=COALESCE($1,name), category=COALESCE($2,category),
         location=COALESCE($3,location), city=COALESCE($4,city),
         description=COALESCE($5,description), image_url=COALESCE($6,image_url),
         price_range=COALESCE($7,price_range), latitude=COALESCE($8,latitude),
         longitude=COALESCE($9,longitude), amenities=COALESCE($10,amenities),
         open_time=COALESCE($11,open_time), close_time=COALESCE($12,close_time),
         phone=COALESCE($13,phone), is_active=COALESCE($14,is_active)
       WHERE id=$15 AND owner_id=$16
       RETURNING *`,
      [
        name,
        category,
        location,
        city,
        description,
        image_url,
        price_range,
        latitude,
        longitude,
        amenities,
        open_time,
        close_time,
        phone,
        is_active,
        req.params.id,
        req.userId,
      ],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ═══════════════════════════════════════════════════════
// SLOTS MANAGEMENT
// ═══════════════════════════════════════════════════════
router.get("/venues/:venueId/slots", async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT id FROM venues WHERE id=$1 AND owner_id=$2",
      [req.params.venueId, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Заведение не найдено" });

    const { rows } = await pool.query(
      "SELECT * FROM venue_slots WHERE venue_id=$1 ORDER BY name",
      [req.params.venueId],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/venues/:venueId/slots", async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT id FROM venues WHERE id=$1 AND owner_id=$2",
      [req.params.venueId, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Заведение не найдено" });

    const { name, description, capacity, price, duration } = req.body;
    if (!name)
      return res.status(400).json({ error: "Название слота обязательно" });

    const { rows } = await pool.query(
      `INSERT INTO venue_slots (venue_id, name, description, capacity, price, duration)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.venueId, name, description, capacity || 1, price || 0, duration || 60],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.put("/slots/:slotId", async (req, res) => {
  try {
    const { name, description, capacity, price, duration, is_active } = req.body;
    const check = await pool.query(
      `SELECT vs.id FROM venue_slots vs
       JOIN venues v ON v.id=vs.venue_id
       WHERE vs.id=$1 AND v.owner_id=$2`,
      [req.params.slotId, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Слот не найден" });

    const { rows } = await pool.query(
      `UPDATE venue_slots SET
         name=COALESCE($1,name), description=COALESCE($2,description),
         capacity=COALESCE($3,capacity), price=COALESCE($4,price),
         duration=COALESCE($5,duration), is_active=COALESCE($6,is_active)
       WHERE id=$7 RETURNING *`,
      [name, description, capacity, price, duration, is_active, req.params.slotId],
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.delete("/slots/:slotId", async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT vs.id FROM venue_slots vs
       JOIN venues v ON v.id=vs.venue_id
       WHERE vs.id=$1 AND v.owner_id=$2`,
      [req.params.slotId, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Слот не найден" });
    await pool.query("DELETE FROM venue_slots WHERE id=$1", [
      req.params.slotId,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ═══════════════════════════════════════════════════════
// BOOKINGS MANAGEMENT
// ═══════════════════════════════════════════════════════
router.get("/bookings", async (req, res) => {
  try {
    const { status, venue_id, date } = req.query;
    let sql = `
      SELECT
        b.*,
        v.name        AS venue_name,
        v.location    AS venue_location,
        u.name         AS client_name,
        u.email        AS client_email,
        u.phone        AS client_phone,
        u.avatar_url   AS client_avatar,
        u.client_rating AS client_rating,
        u.rating_count  AS client_rating_count,
        vs.name       AS slot_name
      FROM bookings b
      JOIN venues v ON v.id = b.venue_id
      JOIN users u ON u.id = b.user_id
      LEFT JOIN venue_slots vs ON vs.id = b.slot_id
      WHERE v.owner_id = $1`;
    const params = [req.userId];

    if (status) {
      params.push(status);
      sql += ` AND b.status=$${params.length}`;
    }
    if (venue_id) {
      params.push(venue_id);
      sql += ` AND b.venue_id=$${params.length}`;
    }
    if (date) {
      params.push(date);
      sql += ` AND b.date=$${params.length}`;
    }

    sql += " ORDER BY b.date DESC, b.time DESC";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.patch("/bookings/:id/confirm", async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT b.id, b.user_id, b.date, b.time, v.name AS venue_name
       FROM bookings b JOIN venues v ON v.id=b.venue_id
       WHERE b.id=$1 AND v.owner_id=$2`,
      [req.params.id, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Бронь не найдена" });

    const { rows } = await pool.query(
      `UPDATE bookings SET status='confirmed' WHERE id=$1 RETURNING *`,
      [req.params.id],
    );

    const b = check.rows[0];
    pool
      .query(
        `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'booking', 'Бронь подтверждена', $2)`,
        [
          b.user_id,
          `Ваша бронь в "${b.venue_name}" на ${b.date} в ${b.time} подтверждена.`,
        ],
      )
      .catch(console.error);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT b.id, b.user_id, b.date, b.time, v.name AS venue_name
       FROM bookings b JOIN venues v ON v.id=b.venue_id
       WHERE b.id=$1 AND v.owner_id=$2`,
      [req.params.id, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Бронь не найдена" });

    const { rows } = await pool.query(
      `UPDATE bookings SET status='cancelled' WHERE id=$1 RETURNING *`,
      [req.params.id],
    );

    const b = check.rows[0];
    pool
      .query(
        `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'booking', 'Бронь отменена', $2)`,
        [
          b.user_id,
          `Ваша бронь в "${b.venue_name}" на ${b.date} в ${b.time} отменена заведением.`,
        ],
      )
      .catch(console.error);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.patch("/bookings/:id/complete", async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT b.id, b.user_id, b.date, b.time, v.name AS venue_name
       FROM bookings b JOIN venues v ON v.id=b.venue_id
       WHERE b.id=$1 AND v.owner_id=$2 AND b.status='confirmed'`,
      [req.params.id, req.userId],
    );
    if (check.rows.length === 0)
      return res
        .status(404)
        .json({ error: "Бронь не найдена или не в статусе confirmed" });

    const { rows } = await pool.query(
      `UPDATE bookings SET status='completed' WHERE id=$1 RETURNING *`,
      [req.params.id],
    );

    const b = check.rows[0];
    pool
      .query(
        `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'booking', 'Бронь завершена', $2)`,
        [
          b.user_id,
          `Ваша бронь в "${b.venue_name}" на ${b.date} в ${b.time} завершена.`,
        ],
      )
      .catch(console.error);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ═══════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════
router.get("/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [
      bookingsToday,
      bookingsWeek,
      weeklyRevenue,
      totalBookings,
      popularHours,
      repeatCustomers,
      avgRating,
      pendingCount,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM bookings b JOIN venues v ON v.id=b.venue_id
         WHERE v.owner_id=$1 AND b.date=$2 AND b.status NOT IN ('cancelled')`,
        [req.userId, today],
      ),
      pool.query(
        `SELECT COUNT(*) FROM bookings b JOIN venues v ON v.id=b.venue_id
         WHERE v.owner_id=$1 AND b.date >= $2 AND b.status NOT IN ('cancelled')`,
        [req.userId, weekAgo],
      ),
      pool.query(
        `SELECT COALESCE(SUM(b.total_price),0) AS revenue
         FROM bookings b JOIN venues v ON v.id=b.venue_id
         WHERE v.owner_id=$1 AND b.date >= $2 AND b.status IN ('confirmed','completed')`,
        [req.userId, weekAgo],
      ),
      pool.query(
        `SELECT COUNT(*) FROM bookings b JOIN venues v ON v.id=b.venue_id
         WHERE v.owner_id=$1 AND b.status NOT IN ('cancelled')`,
        [req.userId],
      ),
      pool.query(
        `SELECT b.time, COUNT(*) AS cnt
         FROM bookings b JOIN venues v ON v.id=b.venue_id
         WHERE v.owner_id=$1 AND b.status NOT IN ('cancelled')
         GROUP BY b.time ORDER BY cnt DESC LIMIT 5`,
        [req.userId],
      ),
      pool.query(
        `SELECT COUNT(*) AS repeat_count
         FROM (
           SELECT b.user_id FROM bookings b
           JOIN venues v ON v.id=b.venue_id
           WHERE v.owner_id=$1 AND b.status NOT IN ('cancelled')
           GROUP BY b.user_id HAVING COUNT(*) > 1
         ) sub`,
        [req.userId],
      ),
      pool.query(
        `SELECT ROUND(AVG(r.rating)::numeric,2) AS avg_rating, COUNT(*) AS total_reviews
         FROM reviews r JOIN venues v ON v.id=r.venue_id
         WHERE v.owner_id=$1`,
        [req.userId],
      ),
      pool.query(
        `SELECT COUNT(*) FROM bookings b JOIN venues v ON v.id=b.venue_id
         WHERE v.owner_id=$1 AND b.status='pending'`,
        [req.userId],
      ),
    ]);

    // Bookings by day for last 7 days
    const weeklyChart = await pool.query(
      `SELECT b.date::text AS day, COUNT(*) AS bookings, COALESCE(SUM(b.total_price),0) AS revenue
       FROM bookings b JOIN venues v ON v.id=b.venue_id
       WHERE v.owner_id=$1 AND b.date >= $2 AND b.status NOT IN ('cancelled')
       GROUP BY b.date ORDER BY b.date`,
      [req.userId, weekAgo],
    );

    res.json({
      bookings_today: Number(bookingsToday.rows[0].count),
      bookings_week: Number(bookingsWeek.rows[0].count),
      weekly_revenue: Number(weeklyRevenue.rows[0].revenue),
      total_bookings: Number(totalBookings.rows[0].count),
      pending_bookings: Number(pendingCount.rows[0].count),
      popular_hours: popularHours.rows,
      repeat_customers: Number(repeatCustomers.rows[0].repeat_count),
      avg_rating: Number(avgRating.rows[0]?.avg_rating || 0),
      total_reviews: Number(avgRating.rows[0]?.total_reviews || 0),
      weekly_chart: weeklyChart.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ═══════════════════════════════════════════════════════
// SERVICES MANAGEMENT (for owner's venues)
// ═══════════════════════════════════════════════════════
router.get("/venues/:venueId/services", async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT id FROM venues WHERE id=$1 AND owner_id=$2",
      [req.params.venueId, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Заведение не найдено" });
    const { rows } = await pool.query(
      "SELECT * FROM services WHERE venue_id=$1 ORDER BY price",
      [req.params.venueId],
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/venues/:venueId/services", async (req, res) => {
  try {
    const check = await pool.query(
      "SELECT id FROM venues WHERE id=$1 AND owner_id=$2",
      [req.params.venueId, req.userId],
    );
    if (check.rows.length === 0)
      return res.status(404).json({ error: "Заведение не найдено" });
    const { name, description, price, duration } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO services (venue_id, name, description, price, duration) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.venueId, name, description, price || 0, duration || 60],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// ═══════════════════════════════════════════════════════
// RATE CLIENT after completing a booking
// ═══════════════════════════════════════════════════════
router.post("/bookings/:id/rate-client", async (req, res) => {
  const client = await pool.connect();
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: "Оценка должна быть от 1 до 5" });

    await client.query("BEGIN");

    const bookingRes = await client.query(
      `SELECT b.*, v.owner_id, v.name AS venue_name FROM bookings b
       JOIN venues v ON v.id=b.venue_id
       WHERE b.id=$1
       FOR UPDATE`,
      [req.params.id],
    );
    if (!bookingRes.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Бронь не найдена" });
    }

    const booking = bookingRes.rows[0];
    if (booking.owner_id !== req.userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ error: "Нет доступа" });
    }
    if (booking.status !== "completed") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Можно оценивать только завершённые брони" });
    }
    if (booking.client_rated_at) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Клиент по этой брони уже оценён" });
    }

    const userRes = await client.query(
      "SELECT client_rating, rating_count FROM users WHERE id=$1 FOR UPDATE",
      [booking.user_id],
    );
    if (!userRes.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Клиент не найден" });
    }

    const { client_rating, rating_count } = userRes.rows[0];
    const newCount = rating_count + 1;
    const newRating = ((client_rating * rating_count) + rating) / newCount;

    await client.query(
      "UPDATE users SET client_rating=$1, rating_count=$2 WHERE id=$3",
      [Math.round(newRating * 100) / 100, newCount, booking.user_id],
    );
    const ratingUpdate = await client.query(
      `UPDATE bookings
       SET client_rated_at=now(), client_rating_given=$1, client_rating_comment=$2
       WHERE id=$3 AND client_rated_at IS NULL`,
      [rating, comment || null, booking.id],
    );
    if (ratingUpdate.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Клиент по этой брони уже оценён" });
    }
    await client.query("COMMIT");

    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    pool.query(
      `INSERT INTO notifications (user_id,type,title,message) VALUES ($1,'review','Вас оценили',$2)`,
      [booking.user_id, `Заведение "${booking.venue_name}" оценило вас: ${stars}${comment ? ". " + comment : ""}`],
    ).catch(console.error);

    res.json({ success: true, new_rating: Math.round(newRating * 100) / 100 });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("Rate client error:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  } finally {
    client.release();
  }
});

module.exports = router;
