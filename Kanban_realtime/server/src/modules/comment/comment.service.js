const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const boardService = require('../board/board.service');
const activityService = require('../activity/activity.service');
const notificationService = require('../notification/notification.service');
const { getIo } = require('../../websocket/socket');

class CommentService {
  async list(cardId, userId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: true }
    });
    if (!card) throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');

    // Valida acesso global ao Board
    await boardService._checkAccess(card.column.boardId, userId);

    return prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } }
    });
  }

  async create(cardId, userId, content) {
    if (!content || !content.trim()) {
      throw ApiError.badRequest('Conteúdo inválido', 'INVALID_CONTENT');
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: true }
    });
    
    if (!card) throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');
    
    // Member roles -> Admin and Editor can comment
    await boardService._checkAccess(card.column.boardId, userId, ['admin', 'editor']);

    const comment = await prisma.comment.create({
      data: { cardId, userId, content },
      include: { user: { select: { id: true, name: true } } }
    });

    // Salvar ActivityLog
    const log = await activityService.log(card.column.boardId, userId, 'COMMENT_CREATED', {
      cardId,
      cardTitle: card.title,
      commentId: comment.id,
      content: content.substring(0, 50) + (content.length > 50 ? '...' : '')
    });

    try {
      const io = getIo();
      const room = `board_${card.column.boardId}`;

      // Emitir Activity
      io.to(room).emit('activity:create', {
        type: log.action, user: log.user, metadata: log.metadata, createdAt: log.createdAt
      });

      // Emitir "comment:create"
      io.to(room).emit('comment:create', { cardId, comment });
    } catch(err) {
      console.log('Socket IGNORADO no REST mode limpo', err.message);
    }

    // ─── Despachar para Notificações ──────────────────────────────────
    await notificationService.notifyBoard(
       card.column.boardId, 
       userId, 
       'COMMENT_CREATED', 
       cardId, 
       `${log.user.name} comentou no card "${card.title}"`
    );

    return comment;
  }
}

module.exports = new CommentService();
