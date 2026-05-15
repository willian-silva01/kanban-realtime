// =============================================
// Módulo User — Model (Entity)
// =============================================

/**
 * Representação da entidade User
 * Embora o Prisma já gerencie o modelo no banco,
 * esta classe pode ser usada para padronizar os dados 
 * trafegados na aplicação (DTO).
 */
class UserModel {
  constructor({ id, name, email, passwordHash, createdAt, updatedAt }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Retorna os dados do usuário sem a senha (para o payload)
  toSafeObject() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = UserModel;
