const reactionService = require('./reaction.service');

class ReactionController {
  async toggle(req, res, next) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;
      const { emoji } = req.body;
      const reactions = await reactionService.toggle(commentId, userId, emoji);
      res.status(200).json({ success: true, data: reactions });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReactionController();
