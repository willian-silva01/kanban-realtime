const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const boardService = require('../board/board.service');
const emailService = require('../email/email.service');

const emitToBoard = (boardId, event, payload) => {
  try {
    const { getIo } = require('../../websocket/socket');
    getIo().to(`board_${boardId}`).emit(event, payload);
  } catch (_) {}
};

class AssigneeService {
  async addToCard(cardId, targetUserId, requesterId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { boardId: true } } },
    });
    if (!card) throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');

    const { boardId } = card.column;
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    const targetMember = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId: targetUserId } },
      include: { user: { select: { id: true, name: true, email: true, emailAssigned: true } } },
    });
    if (!targetMember) {
      throw ApiError.badRequest('Usuário não é membro deste board', 'NOT_A_BOARD_MEMBER');
    }

    const existing = await prisma.cardAssignee.findUnique({
      where: { cardId_userId: { cardId, userId: targetUserId } },
    });
    if (existing) throw ApiError.conflict('Usuário já atribuído a este card', 'ALREADY_ASSIGNED');

    await prisma.cardAssignee.create({
      data: { cardId, userId: targetUserId, assignedBy: requesterId },
    });

    const assignee = targetMember.user;

    if (targetUserId !== requesterId) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'CARD_ASSIGNED',
          entityId: cardId,
          message: `Você foi atribuído ao cartão "${card.title}"`,
        },
      });

      if (assignee.emailAssigned) {
        const board = await prisma.board.findUnique({ where: { id: boardId }, select: { name: true } });
        const requester = await prisma.user.findUnique({ where: { id: requesterId }, select: { name: true } });
        emailService.sendAssignedEmail({
          toEmail: assignee.email,
          toName: assignee.name,
          toUserId: assignee.id,
          assignedBy: requester?.name ?? 'Alguém',
          cardTitle: card.title,
          boardName: board?.name ?? '',
        }).catch(() => {});
      }
    }

    emitToBoard(boardId, 'card:assignee:added', { cardId, assignee, boardId });
    return { cardId, assignee };
  }

  async removeFromCard(cardId, targetUserId, requesterId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: { select: { boardId: true } } },
    });
    if (!card) throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');

    const { boardId } = card.column;
    await boardService._checkAccess(boardId, requesterId, ['admin', 'editor']);

    const ca = await prisma.cardAssignee.findUnique({
      where: { cardId_userId: { cardId, userId: targetUserId } },
    });
    if (!ca) throw ApiError.notFound('Usuário não está atribuído a este card', 'NOT_ASSIGNED');

    await prisma.cardAssignee.delete({
      where: { cardId_userId: { cardId, userId: targetUserId } },
    });

    emitToBoard(boardId, 'card:assignee:removed', { cardId, userId: targetUserId, boardId });
    return { deleted: true };
  }
}

module.exports = new AssigneeService();
