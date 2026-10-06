// =============================================
// Módulo User — Service
// =============================================

const userRepository = require('./user.repository');
const ApiError = require('../../utils/ApiError');
const prisma = require('../../config/database');

const ALLOWED_PREFS = ['emailMentions', 'emailAssigned', 'emailDueDate', 'emailBoardInvite'];

class UserService {
  async createUser(data) {
    const existingUser = await userRepository.findByEmail(data.email);
    
    if (existingUser) {
      throw ApiError.conflict('Este email já está em uso', 'EMAIL_ALREADY_EXISTS');
    }
    
    const newUser = await userRepository.create(data);
    return newUser.toSafeObject();
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);

    if (!user) {
      throw ApiError.notFound('Usuário não encontrado', 'USER_NOT_FOUND');
    }

    return user.toSafeObject();
  }

  async getEmailPreferences(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailMentions: true, emailAssigned: true, emailDueDate: true, emailBoardInvite: true },
    });
    if (!user) throw ApiError.notFound('Usuário não encontrado', 'USER_NOT_FOUND');
    return user;
  }

  async updateEmailPreferences(userId, data) {
    const update = {};
    for (const key of ALLOWED_PREFS) {
      if (typeof data[key] === 'boolean') update[key] = data[key];
    }
    if (Object.keys(update).length === 0) {
      throw ApiError.badRequest('Nenhum campo válido fornecido', 'INVALID_FIELDS');
    }
    return prisma.user.update({
      where: { id: userId },
      data: update,
      select: { emailMentions: true, emailAssigned: true, emailDueDate: true, emailBoardInvite: true },
    });
  }
}

module.exports = new UserService();
