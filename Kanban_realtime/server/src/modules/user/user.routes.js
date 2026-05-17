const { Router } = require('express');
const userController = require('./user.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = Router();

router.use(authMiddleware);

router.get('/me/email-preferences', userController.getEmailPreferences);
router.patch('/me/email-preferences', userController.updateEmailPreferences);

module.exports = router;
