// =============================================
// Módulo User — Repository
// =============================================

const prisma = require('../../config/database');
const UserModel = require('./user.model');

class UserRepository {
  async create({ name, email, passwordHash }) {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
    return new UserModel(user);
  }

  async findByEmail(email) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user ? new UserModel(user) : null;
  }

  async findById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? new UserModel(user) : null;
  }
}

module.exports = new UserRepository();
