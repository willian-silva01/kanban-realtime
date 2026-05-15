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

// ─── Job: notificações de prazo 24h antes ────────────────────────────────────
async function checkDueDateNotifications() {
  try {
    const prisma = require('./config/database');
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const cards = await prisma.card.findMany({
      where: { dueDate: { gte: now, lte: in24h } },
      include: { column: { select: { boardId: true } } },
    });

    for (const card of cards) {
      const boardId = card.column.boardId;

      // Evita duplicar notificação enviada nas últimas 25h
      const existing = await prisma.notification.findFirst({
        where: {
          type: 'DUE_DATE_REMINDER',
          entityId: card.id,
          createdAt: { gte: new Date(now.getTime() - 25 * 60 * 60 * 1000) },
        },
      });
      if (existing) continue;

      const members = await prisma.boardMember.findMany({ where: { boardId } });
      if (members.length === 0) continue;

      const message = `O card "${card.title}" vence em menos de 24 horas.`;
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: 'DUE_DATE_REMINDER',
          entityId: card.id,
          message,
        })),
      });

      try {
        const { getIo } = require('./websocket/socket');
        const io = getIo();
        const notifs = await prisma.notification.findMany({
          where: {
            userId: { in: members.map((m) => m.userId) },
            entityId: card.id,
            type: 'DUE_DATE_REMINDER',
          },
          orderBy: { createdAt: 'desc' },
          take: members.length,
        });
        notifs.forEach((n) => io.to(`user_${n.userId}`).emit('notification:new', n));
      } catch { /* socket ainda não iniciado */ }
    }
  } catch (err) {
    logger.error(`[DueDateJob] ${err.message}`);
  }
}

setInterval(checkDueDateNotifications, 60 * 60 * 1000);
checkDueDateNotifications();

module.exports = server;
