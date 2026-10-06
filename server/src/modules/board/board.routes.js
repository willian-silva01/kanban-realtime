// =============================================
// Módulo Board — Rotas
// =============================================

const { Router } = require('express');
const boardController = require('./board.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = Router();

// Todas as rotas de board são protegidas
router.use(authMiddleware);

router.get('/', boardController.list);
router.post('/', boardController.create);
router.get('/archived', boardController.listArchived);
router.get('/:id', boardController.getById);
router.put('/:id', boardController.update);
router.delete('/:id', boardController.remove);
router.post('/:id/archive', boardController.archive);
router.post('/:id/unarchive', boardController.unarchive);
router.get('/:id/archived-cards', boardController.listArchivedCards);

// Membros
router.post('/:id/members', boardController.addMember);
router.delete('/:id/members/:uid', boardController.removeMember);

module.exports = router;
