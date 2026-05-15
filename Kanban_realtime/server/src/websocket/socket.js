const { Server } = require('socket.io');
const authSocketMiddleware = require('./middlewares/auth.socket');
const registerBoardHandlers = require('./handlers/board.handler');
const logger = require('../utils/logger');

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      // TODO: restringir para domínios específicos em produção
      // origin: process.env.FRONTEND_URL || 'http://localhost:5173'
      origin: '*',
      methods: ['GET', 'POST'],
    },
    // Melhoria de performance: comprime payloads > 1kb
    perMessageDeflate: {
      threshold: 1024,
    },
  });

  // Middleware de autenticação JWT — valida token no handshake
  io.use(authSocketMiddleware);

  io.on('connection', (socket) => {
    // CORRIGIDO (BUG-06): usa logger.info em vez de console.log
    logger.info(`[Socket] Conectado — user=${socket.user.id} socket=${socket.id}`);

    // Sala pessoal: permite broadcast direto de notificações para o usuário
    // sem expor o socketId (pode mudar a cada reconexão)
    socket.join(`user_${socket.user.id}`);

    // Registra todos os handlers de board, cards, presence e cursors
    registerBoardHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      // CORRIGIDO (BUG-06): usa logger, não console.log
      logger.info(`[Socket] Desconectado — user=${socket.user.id} reason=${reason}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error('[Socket] Socket.io não foi inicializado. Chame initSocket() antes.');
  }
  return io;
}

module.exports = { initSocket, getIo };
