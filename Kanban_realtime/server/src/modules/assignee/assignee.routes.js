const { Router } = require('express');
const assigneeController = require('./assignee.controller');
const authMiddleware = require('../auth/auth.middleware');

const cardAssigneeRouter = Router({ mergeParams: true });
cardAssigneeRouter.use(authMiddleware);
cardAssigneeRouter.post('/', assigneeController.add);
cardAssigneeRouter.delete('/:userId', assigneeController.remove);

module.exports = { cardAssigneeRouter };
