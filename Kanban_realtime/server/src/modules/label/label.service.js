const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const boardService = require('../board/board.service');

const MAX_LABELS_PER_CARD = 5;

const emitToBoard = (boardId, event, payload) => {
  try {
    const { getIo } = require('../../websocket/socket');
    getIo().to(`board_${boardId}`).emit(event, payload);
  } catch (_) {}
};

class LabelService {
  async list(boardId, userId) {
    await boardService._checkAccess(boardId, userId);
    return prisma.label.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(boardId, userId, { name, color }) {
    await boardService._checkAccess(boardId, userId, ['admin', 'editor']);
    const label = await prisma.label.create({
      data: { boardId, name, color },
    });
    emitToBoard(boardId, 'label:created', { label });
    return label;
  }

  async update(boardId, labelId, userId, data) {
    await boardService._checkAccess(boardId, userId, ['admin', 'editor']);
    const existing = await prisma.label.findFirst({
      where: { id: labelId, boardId },
    });
    if (!existing) throw ApiError.notFound('Label não encontrada', 'LABEL_NOT_FOUND');

    const label = await prisma.label.update({ where: { id: labelId }, data });
    emitToBoard(boardId, 'label:updated', { label });
    return label;
  }

  async delete(boardId, labelId, userId) {
    await boardService._checkAccess(boardId, userId, ['admin', 'editor']);
    const existing = await prisma.label.findFirst({
      where: { id: labelId, boardId },
    });
    if (!existing) throw ApiError.notFound('Label não encontrada', 'LABEL_NOT_FOUND');

    await prisma.label.delete({ where: { id: labelId } });
    emitToBoard(boardId, 'label:deleted', { labelId });
    return { deleted: true };
  }

  async addToCard(cardId, labelId, userId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { boardId: true } } },
    });
    if (!card) throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');

    const { boardId } = card.column;
    await boardService._checkAccess(boardId, userId, ['admin', 'editor']);

    const label = await prisma.label.findFirst({ where: { id: labelId, boardId } });
    if (!label) throw ApiError.notFound('Label não encontrada neste board', 'LABEL_NOT_FOUND');

    const count = await prisma.cardLabel.count({ where: { cardId } });
    if (count >= MAX_LABELS_PER_CARD) {
      throw ApiError.badRequest(
        `Limite de ${MAX_LABELS_PER_CARD} labels por card atingido`,
        'LABEL_LIMIT_EXCEEDED'
      );
    }

    const existing = await prisma.cardLabel.findUnique({
      where: { cardId_labelId: { cardId, labelId } },
    });
    if (existing) throw ApiError.conflict('Label já adicionada ao card', 'LABEL_ALREADY_ASSIGNED');

    await prisma.cardLabel.create({ data: { cardId, labelId } });
    emitToBoard(boardId, 'card:label:added', { cardId, label, boardId });
    return { cardId, label };
  }

  async removeFromCard(cardId, labelId, userId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { boardId: true } } },
    });
    if (!card) throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');

    const { boardId } = card.column;
    await boardService._checkAccess(boardId, userId, ['admin', 'editor']);

    const cl = await prisma.cardLabel.findUnique({
      where: { cardId_labelId: { cardId, labelId } },
    });
    if (!cl) throw ApiError.notFound('Label não está neste card', 'LABEL_NOT_ON_CARD');

    await prisma.cardLabel.delete({ where: { cardId_labelId: { cardId, labelId } } });
    emitToBoard(boardId, 'card:label:removed', { cardId, labelId, boardId });
    return { deleted: true };
  }
}

module.exports = new LabelService();
