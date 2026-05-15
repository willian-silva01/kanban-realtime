// =============================================
// Módulo Card — Rotas
// =============================================

const { Router } = require('express');
const cardController = require('./card.controller');
const authMiddleware = require('../auth/auth.middleware');

// Router para /api/columns/:columnId/cards
const columnCardsRouter = Router({ mergeParams: true });
columnCardsRouter.use(authMiddleware);
columnCardsRouter.get('/', cardController.list);
columnCardsRouter.post('/', cardController.create);

// Router para /api/cards/:id
const cardsRouter = Router();
cardsRouter.use(authMiddleware);
cardsRouter.get('/:id', cardController.getById);
cardsRouter.put('/:id', cardController.update);
cardsRouter.delete('/:id', cardController.remove);
cardsRouter.patch('/:id/move', cardController.move);

module.exports = { columnCardsRouter, cardsRouter };
