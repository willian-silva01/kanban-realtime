const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const boardService = require('../board/board.service');
const activityService = require('../activity/activity.service');
const notificationService = require('../notification/notification.service');
const emailService = require('../email/email.service');
const { getIo } = require('../../websocket/socket');
const { groupReactions } = require('./reaction.service');

// Extrai UUIDs de todas as menções @[uuid] no texto
function parseMentions(content) {
  const re = /@\[([0-9a-f-]{36})\]/gi;
  const ids = [];
  let m;
  while ((m = re.exec(content)) !== null) ids.push(m[1]);
  return [...new Set(ids)];
}

class CommentService {
  async list(cardId, userId) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: { column: true }
    });
    if (!card) throw ApiError.notFound('Card não encontrado', 'CARD_NOT_FOUND');

    // Valida acesso global ao Board
    await boardService._checkAccess(card.column.boardId, userId);

    const comments = await prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        reactions: { select: { userId: true, emoji: true } },
      },
    });
    return comments.map((c) => ({ ...c, reactions: groupReactions(c.reactions) }));
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
      io.to(room).emit('activity:new', {
        type: log.action, user: log.user, metadata: log.metadata, createdAt: log.createdAt
      });

      // Emitir "comment:create"
      io.to(room).emit('comment:create', { cardId, comment });
    } catch(err) {
      console.log('Socket IGNORADO no REST mode limpo', err.message);
    }

    // ─── Notificar board (todos os membros exceto autor) ──────────────
    await notificationService.notifyBoard(
       card.column.boardId,
       userId,
       'COMMENT_CREATED',
       cardId,
       `${log.user.name} comentou no card "${card.title}"`
    );

    // ─── Processar menções @[userId] ──────────────────────────────────
    const mentionedIds = parseMentions(content);
    if (mentionedIds.length > 0) {
      // Valida que os IDs mencionados são realmente membros do board
      const members = await prisma.boardMember.findMany({
        where: { boardId: card.column.boardId, userId: { in: mentionedIds } },
        include: { user: { select: { id: true, name: true, email: true, emailMentions: true } } },
      });

      const validIds = members.map((m) => m.user.id);

      await notificationService.notifyMentioned(
        validIds,
        userId,
        'MENTIONED',
        cardId,
        `${log.user.name} mencionou você no card "${card.title}"`
      );

      // E-mail para quem tem emailMentions = true
      const board = await prisma.board.findUnique({ where: { id: card.column.boardId }, select: { name: true } });
      for (const member of members) {
        if (member.user.id !== userId && member.user.emailMentions) {
          emailService.sendMentionEmail({
            toEmail: member.user.email,
            toName: member.user.name,
            toUserId: member.user.id,
            mentionedBy: log.user.name,
            cardTitle: card.title,
            boardName: board?.name ?? '',
            commentContent: content,
          }).catch(() => {}); // fire-and-forget, erros não bloqueiam a resposta
        }
      }
    }

    return comment;
  }
}

module.exports = new CommentService();
