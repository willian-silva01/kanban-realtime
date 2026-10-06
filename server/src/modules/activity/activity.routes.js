// =============================================
// Módulo Activity — Rotas
// =============================================

const { Router } = require('express');
const activityController = require('./activity.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.get('/', activityController.list);

module.exports = router;
