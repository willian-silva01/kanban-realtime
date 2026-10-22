// Rate limit REAL (sem mock de express-rate-limit), para validar o escopo do authLimiter.
jest.mock('../../config/database', () => require('../mocks/prisma'));

const request = require('supertest');
const app = require('../../app');
const prisma = require('../../config/database');

const AUTH_LIMIT = 15; // authLimiter.max em app.js

beforeEach(() => jest.clearAllMocks());

describe('authLimiter', () => {
  it('não conta chamadas de /auth/refresh (rodam a cada carregamento de página)', async () => {
    for (let i = 0; i < AUTH_LIMIT + 5; i++) {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).not.toBe(429);
    }
  });

  it('bloqueia login após o limite de tentativas', async () => {
    prisma.user.findUnique.mockResolvedValue(null); // credenciais inválidas

    const statuses = [];
    for (let i = 0; i < AUTH_LIMIT + 1; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'x@exemplo.com', password: 'errada123' });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, AUTH_LIMIT)).not.toContain(429);
    expect(statuses[AUTH_LIMIT]).toBe(429);
  });
});
