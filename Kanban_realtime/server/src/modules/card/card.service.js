// =============================================
// Módulo Card — Service
// =============================================

const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const boardService = require('../board/board.service');
const activityService = require('../activity/activity.service');
const notificationService = require('../notification/notification.service');
// Helper para emitir ws
const emitActivity = (boardId, log) => {
  try {
    const { getIo } = require('../../websocket/socket');
    const io = getIo();
    io.to(`board_${boardId}`).emit('activity:create', {

      type: log.action,
      user: log.user,
      metadata: log.metadata,
      createdAt: log.createdAt
    });
  } catch(e) { console.log('Socket ignorado no REST (se não iniciado)') }
};

class CardService {
  /**
   * Listar cards de uma coluna
   */
  async listByColumn(columnId, userId) {
    // Buscar a coluna para verificar acesso ao board
    const column = await prisma.column.findUnique({
      where: { id: columnId },
    });

    if (!column) {
      throw ApiError.notFound('Coluna não encontrada', 'COLUMN_NOT_FOUND');
    }

    await boardService._checkAccess(column.boardId, userId);

    const cards = await prisma.card.findMany({
      where: { columnId },
      orderBy: { position: 'asc' },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return cards;
  }

  /**
   * Criar novo card
   */
  async create(columnId, userId, { title, description }) {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
    });

    if (!column) {
      throw ApiError.notFound('Coluna não encontrada', 'COLUMN_NOT_FOUND');
    }

    // Verificar acesso (member+ pode criar cards)
    await boardService._checkAccess(column.boardId, userId, ['admin', 'editor']);

    // Determinar posição (último + 1)
    const lastCard = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
    });

    const position = lastCard ? lastCard.position + 1 : 0;

    const card = await prisma.card.create({
      data: {
        columnId,
        title,
        description: description || null,
        position,
        createdBy: userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const log = await activityService.log(column.boardId, userId, 'CARD_CREATED', {
      cardId: card.id,
      cardTitle: card.title
    });
    emitActivity(column.boardId, log);

    return card;
  }

  /**
   * Obter detalhes de um card
   */
  async getById(cardId, userId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        column: {
          select: {
            id: true,
            name: true,
            boardId: true,
          },
        },
      },
    });

    if (!card) {
      throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');
    }

    // Verificar acesso ao board
    await boardService._checkAccess(card.column.boardId, userId);

    return card;
  }

  /**
   * Atualizar card
   */
  async update(cardId, userId, data) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { select: { boardId: true } },
      },
    });

    if (!card) {
      throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');
    }

    await boardService._checkAccess(card.column.boardId, userId, ['admin', 'editor']);

    const updated = await prisma.card.update({
      where: { id: cardId },
      data,
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return updated;
  }

  /**
   * Deletar card
   */
  async delete(cardId, userId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { select: { boardId: true, id: true } },
      },
    });

    if (!card) {
      throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');
    }

    await boardService._checkAccess(card.column.boardId, userId, ['admin', 'editor']);

    await prisma.card.delete({
      where: { id: cardId },
    });

    // Reordenar cards restantes na coluna
    const remainingCards = await prisma.card.findMany({
      where: { columnId: card.columnId },
      orderBy: { position: 'asc' },
    });

    const updates = remainingCards.map((c, index) =>
      prisma.card.update({
        where: { id: c.id },
        data: { position: index },
      })
    );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return { deleted: true };
  }

  /**
   * Mover card entre colunas (ou reposicionar na mesma coluna)
   */
  async move(cardId, userId, { toColumnId, newPosition }) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { select: { boardId: true, id: true } },
      },
    });

    if (!card) {
      throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');
    }

    await boardService._checkAccess(card.column.boardId, userId, ['admin', 'editor']);

    // Verificar se a coluna destino existe e pertence ao mesmo board
    const targetColumn = await prisma.column.findFirst({
      where: {
        id: toColumnId,
        boardId: card.column.boardId,
      },
    });

    if (!targetColumn) {
      throw ApiError.notFound(
        'Coluna destino não encontrada ou não pertence ao mesmo board',
        'TARGET_COLUMN_NOT_FOUND'
      );
    }

    const fromColumnId = card.columnId;

    await prisma.$transaction(async (tx) => {
      // Remover o card da posição antiga (reordenar coluna de origem)
      await tx.card.updateMany({
        where: {
          columnId: fromColumnId,
          position: { gt: card.position },
        },
        data: {
          position: { decrement: 1 },
        },
      });

      // Abrir espaço na coluna destino
      await tx.card.updateMany({
        where: {
          columnId: toColumnId,
          position: { gte: newPosition },
        },
        data: {
          position: { increment: 1 },
        },
      });

      // Mover o card
      await tx.card.update({
        where: { id: cardId },
        data: {
          columnId: toColumnId,
          position: newPosition,
        },
      });
    });

    // Retornar card atualizado
    const movedCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        column: {
          select: { id: true, name: true, boardId: true },
        },
      },
    });

    const log = await activityService.log(card.column.boardId, userId, 'CARD_MOVED', {
      cardId,
      cardTitle: movedCard.title,
      fromColumn: card.columnId,
      toColumnId: toColumnId
    });
    emitActivity(card.column.boardId, log);

    // ─── Despachar Notificações ─────────────────────────────────────
    await notificationService.notifyBoard(
      card.column.boardId,
      userId,
      'CARD_MOVED',
      cardId,
      `${log.user.name} moveu o card "${movedCard.title}" para outra coluna`
    );

    return {
      card: movedCard,
      fromColumnId,
      toColumnId,
    };
  }
}

module.exports = new CardService();
