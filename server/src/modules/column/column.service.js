// =============================================
// Módulo Column — Service
// =============================================

const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const boardService = require('../board/board.service');

class ColumnService {
  /**
   * Listar colunas de um board (com cards)
   */
  async listByBoard(boardId, userId) {
    // Verificar acesso ao board
    await boardService._checkAccess(boardId, userId);

    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      include: {
        cards: {
          orderBy: { position: 'asc' },
          include: {
            creator: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    return columns;
  }

  /**
   * Criar nova coluna
   */
  async create(boardId, userId, { name }) {
    // Verificar acesso (member+ pode criar colunas)
    await boardService._checkAccess(boardId, userId, ['admin']);

    // Determinar a posição (última + 1)
    const lastColumn = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
    });

    const position = lastColumn ? lastColumn.position + 1 : 0;

    const column = await prisma.column.create({
      data: {
        boardId,
        name,
        position,
      },
      include: {
        cards: true,
      },
    });

    return column;
  }

  /**
   * Atualizar coluna
   */
  async update(boardId, columnId, userId, data) {
    await boardService._checkAccess(boardId, userId, ['admin']);

    // Verificar se a coluna pertence ao board
    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId },
    });

    if (!column) {
      throw ApiError.notFound('Coluna não encontrada neste board', 'COLUMN_NOT_FOUND');
    }

    const updated = await prisma.column.update({
      where: { id: columnId },
      data,
      include: {
        cards: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return updated;
  }

  /**
   * Deletar coluna (e seus cards)
   */
  async delete(boardId, columnId, userId) {
    await boardService._checkAccess(boardId, userId, ['admin']);

    const column = await prisma.column.findFirst({
      where: { id: columnId, boardId },
    });

    if (!column) {
      throw ApiError.notFound('Coluna não encontrada neste board', 'COLUMN_NOT_FOUND');
    }

    await prisma.column.delete({
      where: { id: columnId },
    });

    // Reordenar colunas restantes
    const remainingColumns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
    });

    const updates = remainingColumns.map((col, index) =>
      prisma.column.update({
        where: { id: col.id },
        data: { position: index },
      })
    );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return { deleted: true };
  }

  /**
   * Reordenar colunas
   */
  async reorder(boardId, userId, { columns }) {
    await boardService._checkAccess(boardId, userId, ['admin']);

    const updates = columns.map(({ id, position }) =>
      prisma.column.update({
        where: { id },
        data: { position },
      })
    );

    await prisma.$transaction(updates);

    // Retornar colunas atualizadas
    const updated = await prisma.column.findMany({
      where: { boardId },
      orderBy: { position: 'asc' },
      include: {
        cards: {
          orderBy: { position: 'asc' },
        },
      },
    });

    return updated;
  }
}

module.exports = new ColumnService();
