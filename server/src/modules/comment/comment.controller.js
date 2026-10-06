const commentService = require('./comment.service');

class CommentController {
  async list(req, res, next) {
    try {
      const { cardId } = req.params;
      const userId = req.user.id;
      const comments = await commentService.list(cardId, userId);
      res.status(200).json({ success: true, data: comments });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { cardId } = req.params;
      const userId = req.user.id;
      const { content } = req.body;
      
      const comment = await commentService.create(cardId, userId, content);
      res.status(201).json({ success: true, data: comment, message: 'Comentário adicionado' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CommentController();
