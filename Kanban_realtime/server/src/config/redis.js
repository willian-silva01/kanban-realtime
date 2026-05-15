const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => logger.info('[Redis] Conectado'));
redis.on('error', (err) => logger.error(`[Redis] Erro: ${err.message}`));

module.exports = redis;
