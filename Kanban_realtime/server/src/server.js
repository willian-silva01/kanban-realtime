const http = require('http');
const { initSocket } = require('./websocket/socket');
const env = require('./config/env');
const logger = require('./utils/logger');
const app = require('./app');

const server = http.createServer(app);
initSocket(server);

server.listen(env.PORT, () => {
  logger.info(`🚀 Servidor Kanban Realtime rodando na porta ${env.PORT}`);
  logger.info(`📍 Ambiente: ${env.NODE_ENV}`);
  logger.info(`🔗 URL: http://localhost:${env.PORT}`);
  logger.info(`❤️  Health: http://localhost:${env.PORT}/api/health`);
});

module.exports = server;
