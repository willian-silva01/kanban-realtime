jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../modules/board/board.service');

const prisma = require('../../config/database');
const boardService = require('../../modules/board/board.service');
const columnService = require('../../modules/column/column.service');

beforeEach(() => jest.clearAllMocks());

describe('ColumnService.listByBoard', () => {
  it('deve verificar acesso e retornar colunas', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    const mockColumns = [{ id: 'col-1', name: 'To Do', position: 0 }];
    prisma.column.findMany.mockResolvedValue(mockColumns);

    const result = await columnService.listByBoard('board-1', 'user-1');

    expect(boardService._checkAccess).toHaveBeenCalledWith('board-1', 'user-1');
    expect(result).toEqual(mockColumns);
  });
});

describe('ColumnService.create', () => {
  it('deve criar coluna na última posição', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.findFirst.mockResolvedValue({ position: 2 });
    const mockColumn = { id: 'col-2', name: 'Done', position: 3 };
    prisma.column.create.mockResolvedValue(mockColumn);

    const result = await columnService.create('board-1', 'user-1', { name: 'Done' });

    expect(prisma.column.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ boardId: 'board-1', name: 'Done', position: 3 }),
      })
    );
    expect(result).toEqual(mockColumn);
  });

  it('deve criar coluna na posição 0 se board está vazio', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.findFirst.mockResolvedValue(null);
    prisma.column.create.mockResolvedValue({ id: 'col-1', position: 0 });

    await columnService.create('board-1', 'user-1', { name: 'To Do' });

    expect(prisma.column.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 0 }),
      })
    );
  });
});

describe('ColumnService.update', () => {
  it('deve lançar COLUMN_NOT_FOUND se coluna não pertence ao board', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.findFirst.mockResolvedValue(null);

    await expect(columnService.update('board-1', 'col-x', 'user-1', { name: 'Novo' }))
      .rejects.toMatchObject({ code: 'COLUMN_NOT_FOUND', statusCode: 404 });
  });

  it('deve atualizar nome da coluna', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.findFirst.mockResolvedValue({ id: 'col-1', boardId: 'board-1' });
    const updated = { id: 'col-1', name: 'In Progress', cards: [] };
    prisma.column.update.mockResolvedValue(updated);

    const result = await columnService.update('board-1', 'col-1', 'user-1', { name: 'In Progress' });

    expect(result).toEqual(updated);
  });
});

describe('ColumnService.delete', () => {
  it('deve lançar COLUMN_NOT_FOUND ao deletar coluna inexistente', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.findFirst.mockResolvedValue(null);

    await expect(columnService.delete('board-1', 'col-x', 'user-1'))
      .rejects.toMatchObject({ code: 'COLUMN_NOT_FOUND' });
  });

  it('deve deletar coluna e reordenar restantes', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.findFirst.mockResolvedValue({ id: 'col-1', boardId: 'board-1' });
    prisma.column.delete.mockResolvedValue({});
    prisma.column.findMany.mockResolvedValue([{ id: 'col-2', position: 1 }]);
    prisma.column.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation((ops) => Promise.all(ops));

    const result = await columnService.delete('board-1', 'col-1', 'user-1');

    expect(result).toEqual({ deleted: true });
    expect(prisma.column.delete).toHaveBeenCalledWith({ where: { id: 'col-1' } });
  });
});

describe('ColumnService.reorder', () => {
  it('deve reordenar colunas no banco', async () => {
    boardService._checkAccess.mockResolvedValue({ role: 'admin' });
    prisma.column.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation((ops) => Promise.all(ops));
    const updatedCols = [{ id: 'col-1', position: 0 }, { id: 'col-2', position: 1 }];
    prisma.column.findMany.mockResolvedValue(updatedCols);

    const payload = { columns: [{ id: 'col-1', position: 0 }, { id: 'col-2', position: 1 }] };
    const result = await columnService.reorder('board-1', 'user-1', payload);

    expect(result).toEqual(updatedCols);
  });
});
