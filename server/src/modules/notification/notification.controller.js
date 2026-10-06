const notificationService = require('./notification.service');

class NotificationController {
  async list(req, res, next) {
    try {
      const userId = req.user.id;
      const notifications = await notificationService.listForUser(userId);
      res.status(200).json({ success: true, data: notifications });
    } catch(err) { next(err); }
  }

  async markRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      await notificationService.markAsRead(id, userId);
      res.status(200).json({ success: true, message: 'Notificação lida.' });
    } catch(err) { next(err); }
  }
}
module.exports = new NotificationController();
