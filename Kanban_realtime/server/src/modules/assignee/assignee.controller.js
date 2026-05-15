const asyncHandler = require('../../utils/asyncHandler');
const assigneeService = require('./assignee.service');
const { addAssigneeSchema } = require('./assignee.validation');

/** POST /api/cards/:cardId/assignees */
const add = asyncHandler(async (req, res) => {
  const { userId } = addAssigneeSchema.parse(req.body);
  const result = await assigneeService.addToCard(req.params.cardId, userId, req.user.id);
  res.status(201).json({ success: true, data: result, message: 'Membro atribuído ao card' });
});

/** DELETE /api/cards/:cardId/assignees/:userId */
const remove = asyncHandler(async (req, res) => {
  await assigneeService.removeFromCard(req.params.cardId, req.params.userId, req.user.id);
  res.status(200).json({ success: true, message: 'Membro removido do card' });
});

module.exports = { add, remove };
