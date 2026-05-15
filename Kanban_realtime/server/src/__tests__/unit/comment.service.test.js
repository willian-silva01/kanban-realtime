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
const commentService = require('../../modules/comment/comment.service');

const MOCK_CARD = {
  id: 'card-1',
  title: 'Tarefa',
  column: { id: 'col-1', boardId: 'board-1' },
};
const MOCK_LOG = {
  action: 'COMMENT_CREATED',
  user: { name: 'User' },
  metadata: {},
  createdAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('CommentService.list', () => {
  it('deve lançar CARD_NOT_FOUND se card não existe', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await expect(commentService.list('card-x', 'user-1'))
      .rejects.toMatchObject({ code: 'CARD_NOT_FOUND' });
  });

  it('deve retornar comentários do card', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    const mockComments = [{ id: 'c-1', content: 'Ótimo!' }];
    prisma.comment.findMany.mockResolvedValue(mockComments);

    const result = await commentService.list('card-1', 'user-1');

    expect(result).toEqual(mockComments);
    expect(boardService._checkAccess).toHaveBeenCalledWith('board-1', 'user-1');
  });
});

describe('CommentService.create', () => {
  it('deve lançar INVALID_CONTENT para conteúdo vazio', async () => {
    await expect(commentService.create('card-1', 'user-1', ''))
      .rejects.toMatchObject({ code: 'INVALID_CONTENT' });

    await expect(commentService.create('card-1', 'user-1', '   '))
      .rejects.toMatchObject({ code: 'INVALID_CONTENT' });
  });

  it('deve lançar CARD_NOT_FOUND se card não existe', async () => {
    prisma.card.findUnique.mockResolvedValue(null);

    await expect(commentService.create('card-x', 'user-1', 'Comentário'))
      .rejects.toMatchObject({ code: 'CARD_NOT_FOUND' });
  });

  it('deve criar comentário e disparar notificação', async () => {
    prisma.card.findUnique.mockResolvedValue(MOCK_CARD);
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    const mockComment = { id: 'c-1', content: 'Ótimo!', user: { id: 'user-1', name: 'User' } };
    prisma.comment.create.mockResolvedValue(mockComment);
    activityService.log.mockResolvedValue(MOCK_LOG);
    notificationService.notifyBoard.mockResolvedValue(undefined);

    const result = await commentService.create('card-1', 'user-1', 'Ótimo!');

    expect(result).toEqual(mockComment);
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { cardId: 'card-1', userId: 'user-1', content: 'Ótimo!' },
      })
    );
    expect(notificationService.notifyBoard).toHaveBeenCalled();
  });
});
