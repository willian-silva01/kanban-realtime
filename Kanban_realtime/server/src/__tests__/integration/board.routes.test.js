jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const prisma = require('../../config/database');

const TEST_USER = { id: 'user-1', email: 'user@test.com', name: 'User' };
const TEST_BOARD = {
  id: 'board-1',
  name: 'Meu Board',
  ownerId: 'user-1',
  owner: TEST_USER,
  members: [{ role: 'admin', user: TEST_USER }],
};

function makeToken(user = TEST_USER) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/boards (autenticado)', () => {
  it('deve retornar 401 sem token', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(401);
  });

  it('deve retornar 200 com lista de boards', async () => {
    prisma.board.findMany.mockResolvedValue([TEST_BOARD]);

    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /api/boards', () => {
  it('deve retornar 401 sem token', async () => {
    const res = await request(app).post('/api/boards').send({ name: 'Board' });
    expect(res.status).toBe(401);
  });

  it('deve criar board e retornar 201', async () => {
    prisma.board.create.mockResolvedValue(TEST_BOARD);

    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Meu Board' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Meu Board' });
  });

  it('deve retornar 400 para nome em branco', async () => {
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/boards/:id', () => {
  it('deve retornar 404 para board inexistente', async () => {
    prisma.board.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/boards/board-x')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOARD_NOT_FOUND');
  });

  it('deve retornar 403 se usuário não é membro', async () => {
    prisma.board.findUnique.mockResolvedValue(TEST_BOARD);
    prisma.boardMember.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/boards/board-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('deve retornar 200 com dados do board', async () => {
    prisma.board.findUnique.mockResolvedValue(TEST_BOARD);
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'admin' });

    const res = await request(app)
      .get('/api/boards/board-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('board-1');
  });
});

describe('DELETE /api/boards/:id', () => {
  it('deve retornar 200 ao deletar board com permissão', async () => {
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'admin' });
    prisma.board.delete.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/boards/board-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
  });

  it('deve retornar 403 se usuário não é admin', async () => {
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'viewer' });

    const res = await request(app)
      .delete('/api/boards/board-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/boards/:boardId/columns/reorder', () => {
  const COL_ID_1 = 'a0000000-0000-0000-0000-000000000001';
  const COL_ID_2 = 'a0000000-0000-0000-0000-000000000002';

  it('deve reordenar colunas com permissão admin', async () => {
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'admin' });
    prisma.column.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation((ops) => Promise.all(ops));
    prisma.column.findMany.mockResolvedValue([
      { id: COL_ID_2, name: 'Done', position: 0, cards: [] },
      { id: COL_ID_1, name: 'To Do', position: 1, cards: [] },
    ]);

    const res = await request(app)
      .patch('/api/boards/board-1/columns/reorder')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ columns: [{ id: COL_ID_2, position: 0 }, { id: COL_ID_1, position: 1 }] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].id).toBe(COL_ID_2);
    expect(res.body.data[1].id).toBe(COL_ID_1);
  });

  it('deve retornar 403 se usuário não é admin', async () => {
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'viewer' });

    const res = await request(app)
      .patch('/api/boards/board-1/columns/reorder')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ columns: [{ id: COL_ID_1, position: 0 }] });

    expect(res.status).toBe(403);
  });

  it('deve retornar 400 para payload vazio', async () => {
    const res = await request(app)
      .patch('/api/boards/board-1/columns/reorder')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ columns: [] });

    expect(res.status).toBe(400);
  });

  it('deve retornar 401 sem token', async () => {
    const res = await request(app)
      .patch('/api/boards/board-1/columns/reorder')
      .send({ columns: [{ id: COL_ID_1, position: 0 }] });

    expect(res.status).toBe(401);
  });
});
