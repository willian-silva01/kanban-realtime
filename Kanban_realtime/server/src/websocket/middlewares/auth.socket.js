const jwt = require('jsonwebtoken');
const env = require('../../config/env');

/**
 * Middleware para Socket.io
 * Valida o token JWT e anexa o payload decodificado ao socket.user
 */
module.exports = (socket, next) => {
  try {
    // Busca na ordem: auth.token (React client) ou cabeçalho Authorization
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization &&
        socket.handshake.headers.authorization.split(' ')[1]);

    if (!token) {
      return next(new Error('TOKEN_MISSING'));
    }

    // CORRIGIDO: usa apenas env.JWT_SECRET — sem fallback hardcoded inseguro
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // CORRIGIDO: expõe apenas id e email — não vaza iat/exp no socket.user
    socket.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (_error) {
    next(new Error('TOKEN_INVALID'));
  }
};
