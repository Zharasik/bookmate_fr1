const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../app');

jest.mock('../db/pool');
const pool = require('../db/pool');

beforeEach(() => jest.resetAllMocks());

describe('POST /api/auth/register', () => {
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123', name: 'Test' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already exists', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] });
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'exists@b.com', password: 'validPass1', name: 'Test' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/уже существует/i);
  });

  it('returns 201 and userId on success', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })  // email not exists
      .mockResolvedValueOnce({ rows: [{ id: 'new-id', email: 'new@b.com', name: 'Test' }] });  // insert pending

    const res = await request(app).post('/api/auth/register')
      .send({ email: 'new@b.com', password: 'ValidPass1', name: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('new-id');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when user does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@b.com', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 when password is wrong', async () => {
    const hash = await bcrypt.hash('correctPass', 10);
    pool.query.mockResolvedValueOnce({ rows: [{ id: '1', email: 'a@b.com', name: 'A', password_hash: hash, role: 'user', email_verified: true }] });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrongPass' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when email is not verified', async () => {
    const hash = await bcrypt.hash('correctPass', 10);
    pool.query.mockResolvedValueOnce({ rows: [{ id: '1', email: 'a@b.com', name: 'A', password_hash: hash, role: 'user', email_verified: false }] });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correctPass' });
    expect(res.status).toBe(403);
    expect(res.body.needsVerification).toBe(true);
  });

  it('returns 200 with token on success', async () => {
    const hash = await bcrypt.hash('correctPass', 10);
    pool.query.mockResolvedValueOnce({ rows: [{ id: '1', email: 'a@b.com', name: 'A', avatar_url: null, phone: null, password_hash: hash, role: 'user', email_verified: true, client_rating: 5 }] });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correctPass' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('a@b.com');
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid token', async () => {
    const jwt = require('jsonwebtoken');
    process.env.JWT_SECRET = 'test-secret';
    const token = jwt.sign({ userId: '1', role: 'user' }, 'test-secret');
    pool.query.mockResolvedValueOnce({ rows: [{ id: '1', email: 'a@b.com', name: 'A', role: 'user', email_verified: true }] });
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@b.com');
  });
});
