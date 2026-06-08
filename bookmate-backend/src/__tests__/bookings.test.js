const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

jest.mock('../db/pool');
const pool = require('../db/pool');

const TEST_SECRET = 'test-secret';

function makeToken(userId = 'user-1', role = 'user') {
  return jwt.sign({ userId, role }, TEST_SECRET);
}

beforeAll(() => { process.env.JWT_SECRET = TEST_SECRET; });

beforeEach(() => {
  jest.resetAllMocks();
  // Restore connect mock after reset — routes using transactions need it
  const mockClient = { query: jest.fn(), release: jest.fn() };
  pool.connect.mockResolvedValue(mockClient);
  pool._mockClient = mockClient;
});

describe('GET /api/bookings', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid token and empty list', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns bookings for the authenticated user', async () => {
    const booking = { id: 'b-1', venue_name: 'Test Venue', status: 'pending', date: '2026-07-01', time: '10:00' };
    pool.query.mockResolvedValueOnce({ rows: [booking] });
    const res = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe('b-1');
  });

  it('returns the next calendar day as end_date for overnight bookings', async () => {
    const booking = {
      id: 'b-overnight',
      venue_name: 'Night Venue',
      status: 'pending',
      date: '2026-05-25',
      time: '23:00',
      end_time: '01:00',
    };
    pool.query.mockResolvedValueOnce({ rows: [booking] });

    const res = await request(app).get('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body[0].date).toBe('2026-05-25');
    expect(res.body[0].time).toBe('23:00');
    expect(res.body[0].end_date).toBe('2026-05-26');
    expect(res.body[0].end_time).toBe('01:00');
  });
});

describe('GET /api/bookings/availability/:venueId', () => {
  it('splits an overnight booking across the actual occupied dates', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 'slot-1', name: 'Table 1', description: null, capacity: 1, price: 0, duration: 60 }],
      })
      .mockResolvedValueOnce({
        rows: [{
          slot_id: 'slot-1',
          date: '2026-06-08',
          time: '23:00',
          end_time: '01:00',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'slot-1', name: 'Table 1', description: null, capacity: 1, price: 0, duration: 60 }],
      })
      .mockResolvedValueOnce({
        rows: [{
          slot_id: 'slot-1',
          date: '2026-06-08',
          time: '23:00',
          end_time: '01:00',
        }],
      });

    const startDateRes = await request(app).get('/api/bookings/availability/venue-1?date=2026-06-08');
    expect(startDateRes.status).toBe(200);
    expect(startDateRes.body.slots[0].booked_ranges).toEqual([{ start: '23:00', end: '24:00' }]);
    expect(startDateRes.body.venue_ranges).toEqual([{ start: '23:00', end: '24:00' }]);

    const nextDateRes = await request(app).get('/api/bookings/availability/venue-1?date=2026-06-09');
    expect(nextDateRes.status).toBe(200);
    expect(nextDateRes.body.slots[0].booked_ranges).toEqual([{ start: '00:00', end: '01:00' }]);
    expect(nextDateRes.body.venue_ranges).toEqual([{ start: '00:00', end: '01:00' }]);
  });
});

describe('POST /api/bookings', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/bookings')
      .send({ venue_id: 'v-1', date: '2026-07-01', time: '10:00' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when date and time are missing', async () => {
    const res = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ venue_id: 'v-1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/обязательны/i);
  });

  it('returns 400 when booking time is in the past', async () => {
    const res = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ venue_id: 'v-1', date: '2020-01-01', time: '10:00', duration: 60, guests: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/прошедшее/i);
  });

  it('stores end_date as the next day when a created booking crosses midnight', async () => {
    const client = pool._mockClient;
    client.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 'venue-1' }] }) // lock venue
      .mockResolvedValueOnce({ rows: [] }) // user conflicts
      .mockResolvedValueOnce({
        rows: [{
          id: 'booking-1',
          user_id: 'user-1',
          venue_id: 'venue-1',
          date: '2026-07-25',
          time: '23:00',
          end_date: '2026-07-26',
          end_time: '01:00',
          status: 'pending',
        }],
      }) // insert booking
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    pool.query
      .mockResolvedValueOnce({ rows: [{ name: 'Night Venue' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/bookings')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({
        venue_id: 'venue-1',
        date: '2026-07-25',
        time: '23:00',
        duration: 120,
        guests: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.date).toBe('2026-07-25');
    expect(res.body.end_date).toBe('2026-07-26');
    expect(res.body.end_time).toBe('01:00');
    expect(client.query.mock.calls[3][1]).toEqual([
      'user-1',
      'venue-1',
      null,
      null,
      '2026-07-25',
      '23:00',
      '2026-07-26',
      '01:00',
      1,
      0,
      null,
    ]);
  });
});

describe('PATCH /api/bookings/:id/cancel', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).patch('/api/bookings/b-1/cancel');
    expect(res.status).toBe(401);
  });

  it('returns 404 when booking does not belong to user or is already cancelled', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).patch('/api/bookings/nonexistent/cancel')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(404);
  });
});
