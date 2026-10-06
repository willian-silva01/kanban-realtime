const prisma = require('../../config/database');
const { getIo } = require('../../websocket/socket');

class NotificationService {
  
  // Buscar não lidas (ou todas pagination, vamos manter simples para a UI)
  async listForUser(userId) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30
    });
  }

  // Marcar como lida
  async markAsRead(id, userId) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true }
    });
  }

  // Notificar apenas os usuários mencionados (não em lote do board inteiro)
  async notifyMentioned(mentionedUserIds, causerUserId, type, entityId, message) {
    try {
      const targets = mentionedUserIds.filter((id) => id !== causerUserId);
      if (targets.length === 0) return;

      await prisma.notification.createMany({
        data: targets.map((userId) => ({ userId, type, entityId, message })),
      });

      const recentNotifs = await prisma.notification.findMany({
        where: { userId: { in: targets }, entityId, type },
        orderBy: { createdAt: 'desc' },
        take: targets.length,
      });

      const io = getIo();
      for (const notif of recentNotifs) {
        io.to(`user_${notif.userId}`).emit('notification:new', notif);
      }
    } catch (err) {
      console.log('Error notifying mentioned users', err);
    }
  }

  // Criar e Emitir em Lote para o Board todo, exceto quem causou
  async notifyBoard(boardId, causerUserId, type, entityId, message) {
    try {
      // 1 Puxa todos os membros do board
      const members = await prisma.boardMember.findMany({
        where: { boardId, userId: { not: causerUserId } }
      });

      if (members.length === 0) return;

      // 2 Formatar para inserção massiva
      const notifsData = members.map(m => ({
        userId: m.userId,
        type,
        entityId,
        message
      }));

      // Insete DB
      await prisma.notification.createMany({ data: notifsData });

      // Como o createMany não retorna os IDs gerados detalhadamente no Postgres de forma simples sem map,
      // fazemos uma fetch rápida para que possamos emitir WS com os IDs certinhos para o frontend despachar o PATCH read depois.
      // Ou simplificando, emite um fallback recem criado
      const recentNotifs = await prisma.notification.findMany({
         where: { 
            userId: { in: members.map(m => m.userId) }, 
            entityId, 
            type
         },
         orderBy: { createdAt: 'desc' },
         take: members.length
      });

      const io = getIo();
      
      // 3 Emitir apenas para os afetados usando as "salas pessoais" que fizemos no socket connection
      for (const notif of recentNotifs) {
        io.to(`user_${notif.userId}`).emit('notification:new', notif);
      }
    } catch(err) {
      console.log('Error notifying board', err);
    }
  }

}

module.exports = new NotificationService();
