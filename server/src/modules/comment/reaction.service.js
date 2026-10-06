const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const boardService = require('../board/board.service');
const { getIo } = require('../../websocket/socket');

const ALLOWED_EMOJIS = ['👍', '❤️', '🎉', '😄', '🤔', '😕'];

function groupReactions(reactions) {
  const map = {};
  for (const r of (reactions ?? [])) {
    if (!map[r.emoji]) map[r.emoji] = { emoji: r.emoji, count: 0, users: [] };
    map[r.emoji].count++;
    map[r.emoji].users.push(r.userId);
  }
  return Object.values(map);
}

class ReactionService {
  async toggle(commentId, userId, emoji) {
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      throw ApiError.badRequest('Emoji não permitido', 'INVALID_EMOJI');
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { card: { include: { column: true } } },
    });
    if (!comment) throw ApiError.notFound('Comentário não encontrado', 'COMMENT_NOT_FOUND');

    const boardId = comment.card.column.boardId;
    await boardService._checkAccess(boardId, userId);

    const existing = await prisma.commentReaction.findFirst({
      where: { commentId, userId, emoji },
    });

    if (existing) {
      await prisma.commentReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.commentReaction.create({ data: { commentId, userId, emoji } });
    }

    const all = await prisma.commentReaction.findMany({ where: { commentId } });
    const reactions = groupReactions(all);

    try {
      const io = getIo();
      io.to(`board_${boardId}`).emit('comment:reaction:updated', {
        cardId: comment.cardId,
        commentId,
        reactions,
      });
    } catch (_) {}

    return reactions;
  }
}

module.exports = new ReactionService();
module.exports.groupReactions = groupReactions;
