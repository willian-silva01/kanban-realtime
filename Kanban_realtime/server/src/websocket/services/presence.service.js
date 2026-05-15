const logger = require('../../utils/logger');

/**
 * PresenceService — Camada de abstração de Estado (State Layer).
 * 
 * Atualmente atua em In-Memory (Mock do Redis) para facilitar o desacoplamento.
 * Todas as funções foram definidas como "async / await" propositadamente
 * para que, futuramente, a substituição da engine por Redis (io-redis) 
 * não quebre as rotas superiores do Socket.IO.
 */
class PresenceService {
  constructor() {
    this.onlineUsers = {};
  }

  /**
   * Adiciona o usuário na memória do Quarto do Board.
   * Evita duplicatas se múltiplos sockets pertencerem ao mesmo UserID nativamente.
   */
  async addUser(boardId, user) {
    if (!this.onlineUsers[boardId]) {
      this.onlineUsers[boardId] = [];
    }

    const exists = this.onlineUsers[boardId].find((u) => u.userId === user.userId);
    
    if (!exists) {
      this.onlineUsers[boardId].push(user);
    } else {
      // Se já estava mapeado por 1 aba e recarregou, substitui o socket tracker se achar necessário
      const index = this.onlineUsers[boardId].findIndex(u => u.userId === user.userId);
      this.onlineUsers[boardId][index] = user;
    }
    
    return this.onlineUsers[boardId];
  }

  /**
   * Obtém a lista atual e imediata de conectividades na room do Board
   */
  async getUsers(boardId) {
    return this.onlineUsers[boardId] || [];
  }

  /**
   * Trata a desconexão ou intenção explícita de saída do User na plataforma
   */
  async removeUser(boardId, userId) {
    if (!this.onlineUsers[boardId]) return [];

    this.onlineUsers[boardId] = this.onlineUsers[boardId].filter(
      (u) => u.userId !== userId
    );

    // Garbage Collector Cleanup - Evita Memory Leaks ao manter chaves inúteis
    if (this.onlineUsers[boardId].length === 0) {
      delete this.onlineUsers[boardId];
      logger.debug(`[PresenceService] Memória do Board "${boardId}" limpa definitivamente`);
      return [];
    }

    return this.onlineUsers[boardId];
  }
}

// Retornamos Singleton (para o momento em memória ser compartilhado entre arquivos Node)
// Mas futuramente instanciamos client de Redis aqui
module.exports = new PresenceService();
