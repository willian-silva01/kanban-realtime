const logger = require('../../utils/logger');
const presenceService = require('../services/presence.service');

module.exports = (io, socket) => {
  const userId = socket.user.id;

  // ─── ENTRAR E SAIR NO BOARD (ROOMS) ─────────────────────────────────────

  socket.on('board:join', async ({ boardId }, callback) => {
    logger.debug(`[Socket] board:join — user=${userId} board=${boardId}`);
    const boardService = require('../../modules/board/board.service');
    try {
      // getById já chama _checkAccess internamente; lança se não tiver permissão.
      // Fazemos isso ANTES do socket.join para não admitir o socket na room sem acesso.
      const board = await boardService.getById(boardId, userId);

      const room = `board_${boardId}`;
      socket.join(room);
      logger.info(`[Socket] user=${userId} entrou na room=${room}`);

      // Emite estado completo do board apenas para este socket.
      // Usado tanto na conexão inicial quanto na reconexão — o cliente aplica o
      // estado recebido e em seguida drena a fila de ações offline.
      const columns = board.columns.map(({ cards: _cards, ...col }) => col);
      const cards = board.columns.flatMap((col) =>
        col.cards.map(({ labels: cardLabels, ...card }) => ({
          ...card,
          labels: (cardLabels ?? []).map((cl) => cl.label),
        }))
      );
      const boardLabels = board.labels ?? [];
      socket.emit('board:sync', { columns, cards, boardLabels });

      if (typeof callback === 'function') callback({ success: true, room });
    } catch (error) {
      logger.warn(`[Socket] board:join falhou — user=${userId} board=${boardId}: ${error.message}`);
      if (typeof callback === 'function') callback({ success: false, message: error.message });
    }
  });

  socket.on('board:leave', ({ boardId }, callback) => {
    logger.debug(`[Socket] board:leave — user=${userId} board=${boardId}`);
    socket.leave(`board_${boardId}`);
    if (typeof callback === 'function') callback({ success: true });
  });

  // ─── CARDS ───────────────────────────────────────────────────────────────

  socket.on('card:move', async ({ boardId, cardId, toColumnId, newPosition }, callback) => {
    logger.debug(`[Socket] card:move — card=${cardId} → col=${toColumnId} pos=${newPosition}`);
    const cardService = require('../../modules/card/card.service');
    try {
      const result = await cardService.move(cardId, userId, { toColumnId, newPosition });

      // O emissor já aplicou a mudança otimisticamente
      socket.to(`board_${boardId}`).emit('card:move', { ...result });
      logger.debug(`[Socket] card:move broadcast → room=board_${boardId} (excl. emissor)`);

      if (typeof callback === 'function') callback({ success: true, data: result });
    } catch (error) {
      logger.error(`[Socket] card:move falhou — ${error.message}`);
      if (typeof callback === 'function') callback({ success: false, message: error.message });
    }
  });

  socket.on('card:create', ({ boardId, card }) => {
    socket.to(`board_${boardId}`).emit('card:create', card);
  });

  socket.on('card:update', ({ boardId, card }) => {
    socket.to(`board_${boardId}`).emit('card:update', card);
  });

  socket.on('card:delete', ({ boardId, cardId }) => {
    socket.to(`board_${boardId}`).emit('card:delete', { cardId });
  });

  socket.on('card:duedate:updated', ({ boardId, cardId, dueDate }) => {
    socket.to(`board_${boardId}`).emit('card:duedate:updated', { cardId, dueDate });
  });

  // ─── COLUMNS ─────────────────────────────────────────────────────────────

  socket.on('column:create', ({ boardId, column }) => {
    socket.to(`board_${boardId}`).emit('column:create', column);
  });

  socket.on('column:update', ({ boardId, column }) => {
    socket.to(`board_${boardId}`).emit('column:update', column);
  });

  socket.on('column:reorder', ({ boardId, columns }) => {
    socket.to(`board_${boardId}`).emit('column:reorder', { columns });
  });

  // ─── LABELS ──────────────────────────────────────────────────────────────

  socket.on('card:label:added', ({ boardId, cardId, label }) => {
    socket.to(`board_${boardId}`).emit('card:label:added', { cardId, label });
  });

  socket.on('card:label:removed', ({ boardId, cardId, labelId }) => {
    socket.to(`board_${boardId}`).emit('card:label:removed', { cardId, labelId });
  });

  socket.on('label:created', ({ boardId, label }) => {
    socket.to(`board_${boardId}`).emit('label:created', { label });
  });

  socket.on('label:updated', ({ boardId, label }) => {
    socket.to(`board_${boardId}`).emit('label:updated', { label });
  });

  socket.on('label:deleted', ({ boardId, labelId }) => {
    socket.to(`board_${boardId}`).emit('label:deleted', { labelId });
  });

  // ─── CURSORES COOPERATIVOS ───────────────────────────────────────────────

  socket.on('cursor:move', ({ boardId, x, y, name }) => {
    socket.volatile.to(`board_${boardId}`).emit('cursor:move', { userId, x, y, name });
  });

  // ─── PRESENCE (USUÁRIOS ONLINE) ──────────────────────────────────────────

  socket.on('presence:join', async ({ boardId, name }) => {
    logger.debug(`[Socket] presence:join — user=${userId} name=${name} board=${boardId}`);
    
    // Armazena o boardId atual localmente no socket Object para limpeza no disconnect nativo
    socket.currentBoardId = boardId;

    // Desacoplado: Delega a Storage/Redis Abstraction a responsabilidade de gerenciar as inserções
    const currentUsers = await presenceService.addUser(boardId, { userId, name, socketId: socket.id });

    // Emite para a sala a array atualizada que veio do Redis/Storage
    io.to(`board_${boardId}`).emit('presence:update', currentUsers);
  });

  socket.on('presence:leave', async ({ boardId }) => {
    logger.debug(`[Socket] presence:leave — user=${userId} board=${boardId}`);
    
    const currentUsers = await presenceService.removeUser(boardId, userId);
    io.to(`board_${boardId}`).emit('presence:update', currentUsers);
    
    socket.currentBoardId = null;
  });

  // ─── DISCONNECT ──────────────────────────────────────────────────────────

  socket.on('disconnect', async (reason) => {
    logger.debug(`[Socket] disconnect — user=${userId} reason=${reason}`);
    
    const boardId = socket.currentBoardId;
    if (boardId) {
      // Async Cleanup State Layer
      const currentUsers = await presenceService.removeUser(boardId, userId);
      io.to(`board_${boardId}`).emit('presence:update', currentUsers);
      
      // Expurgar visualmente o último SVG Render
      io.to(`board_${boardId}`).emit('cursor:remove', { userId });
    }
  });
};
