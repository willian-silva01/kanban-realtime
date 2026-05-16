const { Router } = require('express');
const checklistController = require('./checklist.controller');
const authMiddleware = require('../auth/auth.middleware');

// Montado em /api/cards/:cardId/checklists
const cardChecklistRouter = Router({ mergeParams: true });
cardChecklistRouter.use(authMiddleware);
cardChecklistRouter.get('/', checklistController.getByCard);
cardChecklistRouter.post('/', checklistController.create);

// Montado em /api/checklists/:checklistId
const checklistRouter = Router({ mergeParams: true });
checklistRouter.use(authMiddleware);
checklistRouter.put('/', checklistController.update);
checklistRouter.delete('/', checklistController.remove);
checklistRouter.post('/items', checklistController.addItem);
checklistRouter.patch('/items', checklistController.reorderItems);
checklistRouter.patch('/items/:itemId', checklistController.updateItem);
checklistRouter.delete('/items/:itemId', checklistController.removeItem);

module.exports = { cardChecklistRouter, checklistRouter };
