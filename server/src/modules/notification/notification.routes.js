const { Router } = require('express');
const notificationController = require('./notification.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
