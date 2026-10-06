const prisma = require('../../config/database');
const ApiError = require('../../utils/ApiError');
const emailService = require('../email/email.service');

function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'workspace';
}

const WORKSPACE_INCLUDE = {
  owner: { select: { id: true, name: true, email: true } },
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { boards: true } },
};

class WorkspaceService {
  async _uniqueSlug(base) {
    const exists = await prisma.workspace.findUnique({ where: { slug: base } });
    if (!exists) return base;
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${base}-${suffix}`;
  }

  async create(userId, { name }) {
    const slug = await this._uniqueSlug(generateSlug(name));

    return prisma.workspace.create({
      data: {
        name,
        slug,
        ownerId: userId,
        members: { create: { userId, role: 'owner' } },
      },
      include: WORKSPACE_INCLUDE,
    });
  }

  async listByUser(userId) {
    return prisma.workspace.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: WORKSPACE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(workspaceId, userId) {
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: WORKSPACE_INCLUDE,
    });

    if (!workspace) {
      throw ApiError.notFound('Workspace não encontrado', 'WORKSPACE_NOT_FOUND');
    }

    await this._checkAccess(workspaceId, userId);
    return workspace;
  }

  async update(workspaceId, userId, data) {
    await this._checkAccess(workspaceId, userId, ['owner', 'admin']);

    return prisma.workspace.update({
      where: { id: workspaceId },
      data,
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
  }

  async delete(workspaceId, userId) {
    await this._checkAccess(workspaceId, userId, ['owner']);
    await prisma.workspace.delete({ where: { id: workspaceId } });
    return { deleted: true };
  }

  async listBoards(workspaceId, userId) {
    await this._checkAccess(workspaceId, userId);

    return prisma.board.findMany({
      where: { workspaceId, archivedAt: null },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { columns: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async addMember(workspaceId, userId, { email, role }) {
    await this._checkAccess(workspaceId, userId, ['owner', 'admin']);

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      throw ApiError.notFound('Usuário não encontrado com este email', 'USER_NOT_FOUND');
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUser.id } },
    });
    if (existing) {
      throw ApiError.conflict('Usuário já é membro deste workspace', 'ALREADY_MEMBER');
    }

    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: targetUser.id, role },
      include: { user: { select: { id: true, name: true, email: true, emailBoardInvite: true } } },
    });

    if (member.user.emailBoardInvite) {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
      const adder = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      emailService.sendMemberAddedEmail({
        toEmail: member.user.email,
        toName: member.user.name,
        toUserId: member.user.id,
        addedBy: adder?.name ?? 'Alguém',
        contextName: workspace?.name ?? '',
        contextType: 'workspace',
      }).catch(() => {});
    }

    return member;
  }

  async removeMember(workspaceId, userId, targetUserId) {
    await this._checkAccess(workspaceId, userId, ['owner', 'admin']);

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (workspace.ownerId === targetUserId) {
      throw ApiError.badRequest('Não é possível remover o dono do workspace', 'CANNOT_REMOVE_OWNER');
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (!member) {
      throw ApiError.notFound('Membro não encontrado', 'MEMBER_NOT_FOUND');
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    return { removed: true };
  }

  async _checkAccess(workspaceId, userId, allowedRoles = null) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw ApiError.forbidden('Você não tem acesso a este workspace', 'ACCESS_DENIED');
    }

    if (allowedRoles && !allowedRoles.includes(member.role)) {
      throw ApiError.forbidden('Você não tem permissão para esta ação', 'INSUFFICIENT_PERMISSIONS');
    }

    return member;
  }
}

module.exports = new WorkspaceService();
