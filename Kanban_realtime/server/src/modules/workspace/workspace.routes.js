const { Router } = require('express');
const workspaceController = require('./workspace.controller');
const authMiddleware = require('../auth/auth.middleware');

const router = Router();
router.use(authMiddleware);

router.get('/', workspaceController.list);
router.post('/', workspaceController.create);
router.get('/:id', workspaceController.getById);
router.put('/:id', workspaceController.update);
router.delete('/:id', workspaceController.remove);
router.get('/:id/boards', workspaceController.listBoards);
router.post('/:id/members', workspaceController.addMember);
router.delete('/:id/members/:uid', workspaceController.removeMember);

module.exports = router;
