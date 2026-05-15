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
  title: 'Tarefa',
  position: 0,
  columnId: 'col-1',
  column: MOCK_COLUMN,
  creator: { id: 'user-1', name: 'User', email: 'u@u.com' },
};

beforeEach(() => jest.clearAllMocks());

describe('CardService.listByColumn', () => {
  it('deve lançar COLUMN_NOT_FOUND para coluna inexistente', async () => {
    prisma.column.findUnique.mockResolvedValue(null);

    await expect(cardService.listByColumn('col-x', 'user-1'))
      .rejects.toMatchObject({ code: 'COLUMN_NOT_FOUND', statusCode: 404 });
  });

  it('deve retornar cards da coluna em ordem', async () => {
    prisma.column.findUnique.mockResolvedValue(MOCK_COLUMN);
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    const mockCards = [MOCK_CARD];
    prisma.card.findMany.mockResolvedValue(mockCards);

    const result = await cardService.listByColumn('col-1', 'user-1');

    expect(result).toEqual(mockCards);
    expect(prisma.card.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { columnId: 'col-1' }, orderBy: { position: 'asc' } })
    );
  });
});

describe('CardService.update', () => {
  it('deve lançar CARD_NOT_FOUND para card inexistente', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await expect(cardService.update('card-x', 'user-1', { title: 'Novo' }))
      .rejects.toMatchObject({ code: 'CARD_NOT_FOUND' });
  });

  it('deve atualizar e retornar card modificado', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    const updatedCard = { ...MOCK_CARD, title: 'Atualizado' };
    prisma.card.update.mockResolvedValue(updatedCard);

    const result = await cardService.update('card-1', 'user-1', { title: 'Atualizado' });

    expect(prisma.card.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'card-1' }, data: { title: 'Atualizado' } })
    );
    expect(result.title).toBe('Atualizado');
  });
});

describe('CardService.move — sucesso', () => {
  it('deve mover card entre colunas e disparar notificação', async () => {
    const targetColumn = { id: 'col-2', boardId: 'board-1' };
    const movedCard = { ...MOCK_CARD, columnId: 'col-2', position: 0, column: targetColumn };

    prisma.card.findUnique
      .mockResolvedValueOnce(MOCK_CARD)   // busca do card original
      .mockResolvedValueOnce(movedCard);  // busca pós-move

    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.findFirst.mockResolvedValue(targetColumn);
    prisma.$transaction.mockImplementation((fn) => fn(prisma));
    prisma.card.updateMany.mockResolvedValue({});
    prisma.card.update.mockResolvedValue(movedCard);

    const log = { action: 'CARD_MOVED', user: { name: 'User' }, metadata: {}, createdAt: new Date() };
    activityService.log.mockResolvedValue(log);
    notificationService.notifyBoard.mockResolvedValue(undefined);

    const result = await cardService.move('card-1', 'user-1', { toColumnId: 'col-2', newPosition: 0 });

    expect(result.fromColumnId).toBe('col-1');
    expect(result.toColumnId).toBe('col-2');
    expect(notificationService.notifyBoard).toHaveBeenCalled();
  });
});
