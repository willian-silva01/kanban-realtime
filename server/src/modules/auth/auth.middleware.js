// =============================================
// Módulo Auth — Middleware de Autenticação JWT
// =============================================

const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // CORRIGIDO: return next(error) em vez de throw — compatível com Express 4.x
  if (!authHeader) {
    return next(ApiError.unauthorized('Token de autenticação não fornecido', 'TOKEN_MISSING'));
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next(ApiError.unauthorized('Formato do token inválido. Use: Bearer <token>', 'TOKEN_INVALID_FORMAT'));
  }

  const token = parts[1];

  try {
    // CORRIGIDO: usa apenas env.JWT_SECRET — sem fallback hardcoded inseguro
    const decoded = jwt.verify(token, env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token JWT expirado', 'TOKEN_EXPIRED'));
    }
    return next(ApiError.unauthorized('Token JWT inválido', 'TOKEN_INVALID'));
  }
};

module.exports = authMiddleware;
