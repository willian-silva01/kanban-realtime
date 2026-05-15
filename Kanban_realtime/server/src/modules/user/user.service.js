// =============================================
// Módulo User — Service
// =============================================

const userRepository = require('./user.repository');
const ApiError = require('../../utils/ApiError');

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
}

module.exports = new UserService();
