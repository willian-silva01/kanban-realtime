const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const boardService = require('../board/board.service');

async function _getCardBoardId(cardId) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { column: { select: { boardId: true } } },
  });
  if (!card) throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');
  return { card, boardId: card.column.boardId };
}

async function _getChecklistBoardId(checklistId) {
  const checklist = await prisma.checklist.findUnique({
    where: { id: checklistId },
    include: {
      card: { include: { column: { select: { boardId: true } } } },
    },
  });
  if (!checklist) throw ApiError.notFound('Checklist não encontrada', 'CHECKLIST_NOT_FOUND');
  return { checklist, boardId: checklist.card.column.boardId };
}

class ChecklistService {
  async getByCard(cardId, requesterId) {
    const { boardId } = await _getCardBoardId(cardId);
    await boardService._checkAccess(boardId, requesterId);
    return prisma.checklist.findMany({
      where: { cardId },
      orderBy: { position: 'asc' },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  async create(cardId, requesterId, { title }) {
    const { boardId } = await _getCardBoardId(cardId);
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    const last = await prisma.checklist.findFirst({
      where: { cardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (last?.position ?? -1) + 1;

    const checklist = await prisma.checklist.create({
      data: { cardId, title, position },
      include: { items: true },
    });
    return { checklist, boardId, cardId };
  }

  async update(checklistId, requesterId, { title }) {
    const { checklist, boardId } = await _getChecklistBoardId(checklistId);
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    const updated = await prisma.checklist.update({
      where: { id: checklistId },
      data: { title },
      include: { items: { orderBy: { position: 'asc' } } },
    });
    return { checklist: updated, cardId: checklist.card.id, boardId };
  }

  async delete(checklistId, requesterId) {
    const { checklist, boardId } = await _getChecklistBoardId(checklistId);
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    await prisma.checklist.delete({ where: { id: checklistId } });
    return { cardId: checklist.card.id, checklistId, boardId };
  }

  async addItem(checklistId, requesterId, { text }) {
    const { checklist, boardId } = await _getChecklistBoardId(checklistId);
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    const last = await prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (last?.position ?? -1) + 1;

    const item = await prisma.checklistItem.create({
      data: { checklistId, text, position },
    });
    return { item, cardId: checklist.card.id, boardId };
  }

  async updateItem(checklistId, itemId, requesterId, updates) {
    const { checklist, boardId } = await _getChecklistBoardId(checklistId);
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    const existing = await prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.checklistId !== checklistId) {
      throw ApiError.notFound('Item não encontrado', 'ITEM_NOT_FOUND');
    }

    const data = {};
    if (updates.text !== undefined) data.text = updates.text;
    if (updates.completed !== undefined) {
      data.completed = updates.completed;
      data.completedBy = updates.completed ? requesterId : null;
    }

    const item = await prisma.checklistItem.update({ where: { id: itemId }, data });
    return { item, cardId: checklist.card.id, boardId };
  }

  async deleteItem(checklistId, itemId, requesterId) {
    const { checklist, boardId } = await _getChecklistBoardId(checklistId);
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    const existing = await prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!existing || existing.checklistId !== checklistId) {
      throw ApiError.notFound('Item não encontrado', 'ITEM_NOT_FOUND');
    }

    await prisma.checklistItem.delete({ where: { id: itemId } });
    return { cardId: checklist.card.id, checklistId, itemId, boardId };
  }

  async reorderItems(checklistId, requesterId, itemIds) {
    const { checklist, boardId } = await _getChecklistBoardId(checklistId);
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    await Promise.all(
      itemIds.map((id, index) =>
        prisma.checklistItem.update({ where: { id }, data: { position: index } })
      )
    );

    const items = await prisma.checklistItem.findMany({
      where: { checklistId },
      orderBy: { position: 'asc' },
    });
    return { items, cardId: checklist.card.id, boardId };
  }
}

module.exports = new ChecklistService();
