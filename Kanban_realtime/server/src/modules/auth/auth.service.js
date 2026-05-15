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

    const safeUser = await userService.createUser({ name, email, passwordHash });
    const accessToken = this._generateAccessToken(safeUser);
    const refreshToken = this._generateRefreshToken(safeUser);

    return { user: safeUser, accessToken, refreshToken };
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

    const safeUser = user.toSafeObject();
    const accessToken = this._generateAccessToken(safeUser);
    const refreshToken = this._generateRefreshToken(safeUser);

    return { user: safeUser, accessToken, refreshToken };
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token não fornecido', 'REFRESH_TOKEN_MISSING');
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Sessão expirada, faça login novamente', 'REFRESH_TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Refresh token inválido', 'REFRESH_TOKEN_INVALID');
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('Usuário não encontrado', 'USER_NOT_FOUND');
    }

    const safeUser = user.toSafeObject();
    const accessToken = this._generateAccessToken(safeUser);
    const newRefreshToken = this._generateRefreshToken(safeUser);

    return { user: safeUser, accessToken, refreshToken: newRefreshToken };
  }

  _generateAccessToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  _generateRefreshToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();
