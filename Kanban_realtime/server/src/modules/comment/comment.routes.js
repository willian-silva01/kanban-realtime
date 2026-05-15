const { Router } = require('express');
const commentController = require('./comment.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = Router({ mergeParams: true });

// Proteger a rota inteira
router.use(authMiddleware);

router.get('/', commentController.list);
router.post('/', commentController.create);

module.exports = router;
