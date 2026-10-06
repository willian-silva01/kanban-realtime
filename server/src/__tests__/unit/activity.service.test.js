jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../modules/board/board.service');

const prisma = require('../../config/database');
const boardService = require('../../modules/board/board.service');
const activityService = require('../../modules/activity/activity.service');

beforeEach(() => jest.clearAllMocks());

describe('ActivityService.log', () => {
  it('deve criar e retornar o log de atividade', async () => {
    const mockLog = {
      id: 'log-1',
      boardId: 'board-1',
      userId: 'user-1',
      action: 'CARD_CREATED',
      metadata: { cardId: 'card-1' },
      createdAt: new Date(),
      user: { id: 'user-1', name: 'User', email: 'u@u.com' },
    };
    prisma.activityLog.create.mockResolvedValue(mockLog);

    const result = await activityService.log('board-1', 'user-1', 'CARD_CREATED', { cardId: 'card-1' });

    expect(prisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { boardId: 'board-1', userId: 'user-1', action: 'CARD_CREATED', metadata: { cardId: 'card-1' } },
      })
    );
    expect(result).toEqual(mockLog);
  });

  it('deve aceitar metadata nulo por padrão', async () => {
    prisma.activityLog.create.mockResolvedValue({ action: 'BOARD_CREATED' });

    await activityService.log('board-1', 'user-1', 'BOARD_CREATED');

    expect(prisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ metadata: null }),
      })
    );
  });
});

describe('ActivityService.listByBoard', () => {
  it('deve verificar acesso e retornar atividades paginadas', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    const mockActivities = [{ id: 'log-1', action: 'CARD_CREATED' }];
    prisma.activityLog.findMany.mockResolvedValue(mockActivities);
    prisma.activityLog.count.mockResolvedValue(1);

    const result = await activityService.listByBoard('board-1', 'user-1', { page: 1, limit: 20 });

    expect(boardService._checkAccess).toHaveBeenCalledWith('board-1', 'user-1');
    expect(result.activities).toEqual(mockActivities);
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('deve calcular skip correto para paginação', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.activityLog.findMany.mockResolvedValue([]);
    prisma.activityLog.count.mockResolvedValue(100);

    await activityService.listByBoard('board-1', 'user-1', { page: 3, limit: 10 });

    expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });
});
