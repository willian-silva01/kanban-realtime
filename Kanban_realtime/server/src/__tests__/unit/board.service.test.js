jest.mock('../../config/database', () => require('../mocks/prisma'));

const prisma = require('../../config/database');
const boardService = require('../../modules/board/board.service');

beforeEach(() => jest.clearAllMocks());

describe('BoardService._checkAccess', () => {
  it('deve lançar ACCESS_DENIED se usuário não é membro', async () => {
    prisma.boardMember.findUnique.mockResolvedValue(null);

    await expect(boardService._checkAccess('board-1', 'user-1'))
      .rejects.toMatchObject({ code: 'ACCESS_DENIED', statusCode: 403 });
  });

  it('deve lançar INSUFFICIENT_PERMISSIONS se role não permitido', async () => {
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'viewer' });

    await expect(boardService._checkAccess('board-1', 'user-1', ['admin']))
      .rejects.toMatchObject({ code: 'INSUFFICIENT_PERMISSIONS', statusCode: 403 });
  });

  it('deve retornar o membro quando acesso é válido', async () => {
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'admin', userId: 'user-1' });

    const result = await boardService._checkAccess('board-1', 'user-1', ['admin']);

    expect(result.role).toBe('admin');
  });

  it('deve aceitar qualquer role quando allowedRoles não é passado', async () => {
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'viewer' });

    const result = await boardService._checkAccess('board-1', 'user-1');

    expect(result.role).toBe('viewer');
  });
});

describe('BoardService.create', () => {
  it('deve criar board com membro admin', async () => {
    const mockBoard = {
      id: 'board-1',
      name: 'Meu Board',
      ownerId: 'user-1',
      members: [{ role: 'admin', user: { id: 'user-1', name: 'User' } }],
      owner: { id: 'user-1', name: 'User', email: 'u@u.com' },
    };
    prisma.board.create.mockResolvedValue(mockBoard);

    const result = await boardService.create('user-1', { name: 'Meu Board' });

    expect(prisma.board.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Meu Board',
          ownerId: 'user-1',
          members: expect.objectContaining({
            create: { userId: 'user-1', role: 'admin' },
          }),
        }),
      })
    );
    expect(result).toEqual(mockBoard);
  });
});

describe('BoardService.listByUser', () => {
  it('deve retornar boards onde o usuário é owner ou membro', async () => {
    const mockBoards = [{ id: 'board-1' }, { id: 'board-2' }];
    prisma.board.findMany.mockResolvedValue(mockBoards);

    const result = await boardService.listByUser('user-1');

    expect(prisma.board.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ ownerId: 'user-1' }, { members: { some: { userId: 'user-1' } } }],
        },
      })
    );
    expect(result).toEqual(mockBoards);
  });
});

describe('BoardService.getById', () => {
  it('deve lançar BOARD_NOT_FOUND se board não existe', async () => {
    prisma.board.findUnique.mockResolvedValue(null);

    await expect(boardService.getById('board-x', 'user-1'))
      .rejects.toMatchObject({ code: 'BOARD_NOT_FOUND', statusCode: 404 });
  });

  it('deve retornar board se usuário tem acesso', async () => {
    const mockBoard = { id: 'board-1', name: 'Board' };
    prisma.board.findUnique.mockResolvedValue(mockBoard);
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'admin' });

    const result = await boardService.getById('board-1', 'user-1');

    expect(result).toEqual(mockBoard);
  });
});

describe('BoardService.addMember', () => {
  it('deve lançar USER_NOT_FOUND se email não existe', async () => {
    prisma.boardMember.findUnique.mockResolvedValue({ role: 'admin' });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(boardService.addMember('board-1', 'user-1', { email: 'x@x.com', role: 'editor' }))
      .rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('deve lançar ALREADY_MEMBER se usuário já é membro', async () => {
    prisma.boardMember.findUnique
      .mockResolvedValueOnce({ role: 'admin' }) // _checkAccess
      .mockResolvedValueOnce({ id: 'member-1' }); // existingMember
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });

    await expect(boardService.addMember('board-1', 'user-1', { email: 'user2@test.com', role: 'editor' }))
      .rejects.toMatchObject({ code: 'ALREADY_MEMBER' });
  });
});
