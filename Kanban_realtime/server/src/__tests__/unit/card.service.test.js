jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../modules/board/board.service');
jest.mock('../../modules/activity/activity.service');
jest.mock('../../modules/notification/notification.service');
jest.mock('../../websocket/socket', () => ({
  getIo: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })),
}));

const prisma = require('../../config/database');
const boardService = require('../../modules/board/board.service');
const activityService = require('../../modules/activity/activity.service');
const notificationService = require('../../modules/notification/notification.service');
const cardService = require('../../modules/card/card.service');

const MOCK_COLUMN = { id: 'col-1', boardId: 'board-1' };
const MOCK_CARD = {
  id: 'card-1',
  title: 'Meu Card',
  position: 0,
  columnId: 'col-1',
  column: MOCK_COLUMN,
  creator: { id: 'user-1', name: 'User', email: 'u@u.com' },
};
const MOCK_LOG = {
  action: 'CARD_CREATED',
  user: { name: 'User' },
  metadata: {},
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('CardService.create', () => {
  it('deve lançar COLUMN_NOT_FOUND se coluna não existe', async () => {
    prisma.column.findUnique.mockResolvedValue(null);

    await expect(cardService.create('col-x', 'user-1', { title: 'Card' }))
      .rejects.toMatchObject({ code: 'COLUMN_NOT_FOUND', statusCode: 404 });
  });

  it('deve criar card na posição correta', async () => {
    prisma.column.findUnique.mockResolvedValue(MOCK_COLUMN);
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.card.findFirst.mockResolvedValue({ position: 2 });
    prisma.card.create.mockResolvedValue(MOCK_CARD);
    activityService.log.mockResolvedValue(MOCK_LOG);

    const result = await cardService.create('col-1', 'user-1', { title: 'Meu Card' });

    expect(prisma.card.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 3, title: 'Meu Card' }),
      })
    );
    expect(result).toEqual(MOCK_CARD);
  });

  it('deve criar card na posição 0 se a coluna está vazia', async () => {
    prisma.column.findUnique.mockResolvedValue(MOCK_COLUMN);
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.card.findFirst.mockResolvedValue(null);
    prisma.card.create.mockResolvedValue(MOCK_CARD);
    activityService.log.mockResolvedValue(MOCK_LOG);

    await cardService.create('col-1', 'user-1', { title: 'Card' });

    expect(prisma.card.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 0 }),
      })
    );
  });
});

describe('CardService.getById', () => {
  it('deve lançar CARD_NOT_FOUND se card não existe', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await expect(cardService.getById('card-x', 'user-1'))
      .rejects.toMatchObject({ code: 'CARD_NOT_FOUND', statusCode: 404 });
  });

  it('deve retornar card se usuário tem acesso', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });

    const result = await cardService.getById('card-1', 'user-1');

    expect(result).toEqual(MOCK_CARD);
  });
});

describe('CardService.delete', () => {
  it('deve lançar CARD_NOT_FOUND ao deletar card inexistente', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await expect(cardService.delete('card-x', 'user-1'))
      .rejects.toMatchObject({ code: 'CARD_NOT_FOUND' });
  });

  it('deve deletar card e reordenar restantes', async () => {
    prisma.card.findUnique.mockResolvedValue({ ...MOCK_CARD, columnId: 'col-1' });
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.card.delete.mockResolvedValue({});
    prisma.card.findMany.mockResolvedValue([
      { id: 'card-2', position: 0 },
      { id: 'card-3', position: 1 },
    ]);
    prisma.card.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation((ops) => Promise.all(ops));

    const result = await cardService.delete('card-1', 'user-1');

    expect(result).toEqual({ deleted: true });
    expect(prisma.card.delete).toHaveBeenCalledWith({ where: { id: 'card-1' } });
  });
});

describe('CardService.move', () => {
  it('deve lançar CARD_NOT_FOUND para card inexistente', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await expect(cardService.move('card-x', 'user-1', { toColumnId: 'col-2', newPosition: 0 }))
      .rejects.toMatchObject({ code: 'CARD_NOT_FOUND' });
  });

  it('deve lançar TARGET_COLUMN_NOT_FOUND se coluna destino não pertence ao board', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.findFirst.mockResolvedValue(null);

    await expect(cardService.move('card-1', 'user-1', { toColumnId: 'col-other', newPosition: 0 }))
      .rejects.toMatchObject({ code: 'TARGET_COLUMN_NOT_FOUND' });
  });
});
