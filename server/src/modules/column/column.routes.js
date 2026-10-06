// =============================================
// Módulo Column — Rotas
// =============================================

const { Router } = require('express');
const columnController = require('./column.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = Router({ mergeParams: true }); // mergeParams para acessar :boardId

// Todas as rotas de colunas são protegidas
router.use(authMiddleware);

router.get('/', columnController.list);
router.post('/', columnController.create);
router.patch('/reorder', columnController.reorder);
router.put('/:id', columnController.update);
router.delete('/:id', columnController.remove);

module.exports = router;
