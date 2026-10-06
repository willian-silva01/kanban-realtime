const { Router } = require('express');
const commentController = require('./comment.controller');
const reactionController = require('./reaction.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.get('/', commentController.list);
router.post('/', commentController.create);
router.post('/:commentId/reactions', reactionController.toggle);

module.exports = router;
