// =============================================
// Logger Simples
// =============================================

const env = require('../config/env');

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = env.isDev ? LOG_LEVELS.debug : LOG_LEVELS.info;

const formatMessage = (level, message, data) => {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  if (data) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
};

const logger = {
  error: (message, data) => {
    if (currentLevel >= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, data));
    }
  },

  warn: (message, data) => {
    if (currentLevel >= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, data));
    }
  },

  info: (message, data) => {
    if (currentLevel >= LOG_LEVELS.info) {
      console.info(formatMessage('info', message, data));
    }
  },

  debug: (message, data) => {
    if (currentLevel >= LOG_LEVELS.debug) {
      console.debug(formatMessage('debug', message, data));
    }
  },
};

module.exports = logger;
