// =============================================
// Módulo Activity — Service
// =============================================

const prisma = require('../../config/database');
const boardService = require('../board/board.service');

class ActivityService {
  /**
   * Registrar uma atividade
   */
  async log(boardId, userId, action, metadata = null) {
    const activity = await prisma.activityLog.create({
      data: {
        boardId,
        userId,
        action,
        metadata,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return activity;
  }

  /**
   * Listar atividades de um board
   */
  async listByBoard(boardId, userId, { page = 1, limit = 20 } = {}) {
    await boardService._checkAccess(boardId, userId);

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { boardId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.activityLog.count({ where: { boardId } }),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new ActivityService();
