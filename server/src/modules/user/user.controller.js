const userService = require('./user.service');

class UserController {
  async getEmailPreferences(req, res, next) {
    try {
      const prefs = await userService.getEmailPreferences(req.userId);
      res.json({ success: true, data: prefs });
    } catch (err) {
      next(err);
    }
  }

  async updateEmailPreferences(req, res, next) {
    try {
      const prefs = await userService.updateEmailPreferences(req.userId, req.body);
      res.json({ success: true, data: prefs });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
