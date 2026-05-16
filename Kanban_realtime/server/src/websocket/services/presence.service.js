const redis = require('../../config/redis');
const logger = require('../../utils/logger');

const PRESENCE_TTL_SECONDS = 300;

// In-memory fallback usado quando Redis está indisponível
const memStore = new Map();

async function redisTry(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback();
  }
}

class PresenceService {
  _key(boardId) {
    return `presence:${boardId}`;
  }

  async addUser(boardId, user) {
    const key = this._key(boardId);
    await redisTry(
      async () => {
        await redis.hset(key, user.userId, JSON.stringify(user));
        await redis.expire(key, PRESENCE_TTL_SECONDS);
      },
      () => {
        if (!memStore.has(key)) memStore.set(key, new Map());
        memStore.get(key).set(user.userId, user);
      }
    );
    return this.getUsers(boardId);
  }

  async getUsers(boardId) {
    const key = this._key(boardId);
    return redisTry(
      async () => {
        const all = await redis.hgetall(key);
        if (!all) return [];
        return Object.values(all).map((v) => JSON.parse(v));
      },
      () => {
        const board = memStore.get(key);
        if (!board) return [];
        return Array.from(board.values());
      }
    );
  }

  async removeUser(boardId, userId) {
    const key = this._key(boardId);
    await redisTry(
      async () => {
        await redis.hdel(key, userId);
        const remaining = await this.getUsers(boardId);
        if (remaining.length === 0) {
          await redis.del(key);
          logger.debug(`[PresenceService] Chave Redis "${key}" removida`);
        }
      },
      () => {
        const board = memStore.get(key);
        if (board) {
          board.delete(userId);
          if (board.size === 0) memStore.delete(key);
        }
      }
    );
    return this.getUsers(boardId);
  }
}

module.exports = new PresenceService();
