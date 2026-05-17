// =============================================
// Módulo Board — Service
// =============================================

const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const emailService = require('../email/email.service');

class BoardService {
  /**
   * Listar boards do usuário (que é owner ou membro)
   */
  async listByUser(userId) {
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { columns: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return boards;
  }

  /**
   * Criar novo board
   */
  async create(userId, { name, workspaceId }) {
    const board = await prisma.board.create({
      data: {
        name,
        ownerId: userId,
        ...(workspaceId ? { workspaceId } : {}),
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    return board;
  }

  /**
   * Obter detalhes do board (com colunas e cards)
   */
  async getById(boardId, userId) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                creator: {
                  select: { id: true, name: true, email: true },
                },
                labels: {
                  include: { label: true },
                },
                assignees: {
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                  },
                },
                checklists: {
                  orderBy: { position: 'asc' },
                  include: { items: { orderBy: { position: 'asc' } } },
                },
              },
            },
          },
        },
        labels: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!board) {
      throw ApiError.notFound('Board não encontrado', 'BOARD_NOT_FOUND');
    }

    // Verificar se o usuário tem acesso
    await this._checkAccess(boardId, userId);

    return board;
  }

  /**
   * Atualizar board
   */
  async update(boardId, userId, data) {
    await this._checkAccess(boardId, userId, ['admin']);

    const board = await prisma.board.update({
      where: { id: boardId },
      data,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return board;
  }

  /**
   * Deletar board (apenas admin)
   */
  async delete(boardId, userId) {
    await this._checkAccess(boardId, userId, ['admin']);

    await prisma.board.delete({
      where: { id: boardId },
    });

    return { deleted: true };
  }

  /**
   * Adicionar membro ao board
   */
  async addMember(boardId, userId, { email, role }) {
    await this._checkAccess(boardId, userId, ['admin']);

    // Buscar usuário pelo email
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      throw ApiError.notFound('Usuário não encontrado com este email', 'USER_NOT_FOUND');
    }

    // Verificar se já é membro
    const existingMember = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      throw ApiError.conflict('Usuário já é membro deste board', 'ALREADY_MEMBER');
    }

    const member = await prisma.boardMember.create({
      data: {
        boardId,
        userId: targetUser.id,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, emailBoardInvite: true },
        },
      },
    });

    if (member.user.emailBoardInvite) {
      const board = await prisma.board.findUnique({ where: { id: boardId }, select: { name: true } });
      const adder = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      emailService.sendMemberAddedEmail({
        toEmail: member.user.email,
        toName: member.user.name,
        toUserId: member.user.id,
        addedBy: adder?.name ?? 'Alguém',
        contextName: board?.name ?? '',
        contextType: 'board',
      }).catch(() => {});
    }

    return member;
  }

  /**
   * Remover membro do board
   */
  async removeMember(boardId, userId, targetUserId) {
    await this._checkAccess(boardId, userId, ['admin']);

    // Não permitir remover o owner
    const board = await prisma.board.findUnique({
      where: { id: boardId },
    });

    if (board.ownerId === targetUserId) {
      throw ApiError.badRequest('Não é possível remover o dono do board', 'CANNOT_REMOVE_OWNER');
    }

    const member = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId: targetUserId,
        },
      },
    });

    if (!member) {
      throw ApiError.notFound('Membro não encontrado', 'MEMBER_NOT_FOUND');
    }

    await prisma.boardMember.delete({
      where: { id: member.id },
    });

    return { removed: true };
  }

  /**
   * Verificar se o usuário tem acesso ao board
   */
  async _checkAccess(boardId, userId, allowedRoles = null) {
    const member = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });

    if (!member) {
      throw ApiError.forbidden('Você não tem acesso a este board', 'ACCESS_DENIED');
    }

    if (allowedRoles && !allowedRoles.includes(member.role)) {
      throw ApiError.forbidden('Você não tem permissão para esta ação', 'INSUFFICIENT_PERMISSIONS');
    }

    return member;
  }
}

module.exports = new BoardService();
