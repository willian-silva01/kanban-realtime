const redis = require('../../config/redis');
const logger = require('../../utils/logger');

// TTL renovado a cada interação — previne usuários fantasma se o disconnect
// não disparar (ex: crash do processo, queda abrupta de rede sem evento TCP).
const PRESENCE_TTL_SECONDS = 300;

class PresenceService {
  _key(boardId) {
    return `presence:${boardId}`;
  }

  async addUser(boardId, user) {
    const key = this._key(boardId);
    await redis.hset(key, user.userId, JSON.stringify(user));
    await redis.expire(key, PRESENCE_TTL_SECONDS);
    return this.getUsers(boardId);
  }

  async getUsers(boardId) {
    const all = await redis.hgetall(this._key(boardId));
    if (!all) return [];
    return Object.values(all).map((v) => JSON.parse(v));
  }

  async removeUser(boardId, userId) {
    const key = this._key(boardId);
    await redis.hdel(key, userId);

    const remaining = await this.getUsers(boardId);
    if (remaining.length === 0) {
      await redis.del(key);
      logger.debug(`[PresenceService] Chave Redis "${key}" removida`);
    }
    return remaining;
  }
}

module.exports = new PresenceService();
