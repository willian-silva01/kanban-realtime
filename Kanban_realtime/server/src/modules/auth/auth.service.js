// =============================================
// Módulo Auth — Service
// =============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../user/user.repository');
const userService = require('../user/user.service');
const ApiError = require('../../utils/ApiError');
const env = require('../../config/env');

class AuthService {
  async register({ name, email, password }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Devolve a criação para o serviço de usuários
    const safeUser = await userService.createUser({ name, email, passwordHash });
    const token = this._generateToken(safeUser);
    
    return { user: safeUser, token };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Mensagem genérica: não revela qual campo está incorreto (anti-enumeration)
      throw ApiError.unauthorized('Email ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Email ou senha inválidos', 'INVALID_CREDENTIALS');
    }

    const token = this._generateToken(user);
    return { user: user.toSafeObject(), token };
  }

  _generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
    };

    // CORRIGIDO: usa env.JWT_EXPIRES_IN (sem hardcode '24h')
    // A variável é definida no .env como '15m'
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }
}

module.exports = new AuthService();
