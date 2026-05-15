const { Router } = require('express');
const labelController = require('./label.controller');
const authMiddleware = require('../auth/auth.middleware');

// Rotas de labels do board: montado em /api/boards/:boardId/labels
const boardLabelRouter = Router({ mergeParams: true });
boardLabelRouter.use(authMiddleware);
boardLabelRouter.get('/', labelController.list);
boardLabelRouter.post('/', labelController.create);
boardLabelRouter.patch('/:labelId', labelController.update);
boardLabelRouter.delete('/:labelId', labelController.remove);

// Rotas de labels do card: montado em /api/cards/:cardId/labels
const cardLabelRouter = Router({ mergeParams: true });
cardLabelRouter.use(authMiddleware);
cardLabelRouter.post('/:labelId', labelController.addToCard);
cardLabelRouter.delete('/:labelId', labelController.removeFromCard);

module.exports = { boardLabelRouter, cardLabelRouter };
