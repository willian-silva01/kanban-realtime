const asyncHandler = require('../../utils/asyncHandler');
const labelService = require('./label.service');
const { createLabelSchema, updateLabelSchema } = require('./label.validation');

/** GET /api/boards/:boardId/labels */
const list = asyncHandler(async (req, res) => {
  const labels = await labelService.list(req.params.boardId, req.user.id);
  res.status(200).json({ success: true, data: labels });
});

/** POST /api/boards/:boardId/labels */
const create = asyncHandler(async (req, res) => {
  const data = createLabelSchema.parse(req.body);
  const label = await labelService.create(req.params.boardId, req.user.id, data);
  res.status(201).json({ success: true, data: label, message: 'Label criada com sucesso' });
});

/** PATCH /api/boards/:boardId/labels/:labelId */
const update = asyncHandler(async (req, res) => {
  const data = updateLabelSchema.parse(req.body);
  const label = await labelService.update(
    req.params.boardId,
    req.params.labelId,
    req.user.id,
    data
  );
  res.status(200).json({ success: true, data: label, message: 'Label atualizada com sucesso' });
});

/** DELETE /api/boards/:boardId/labels/:labelId */
const remove = asyncHandler(async (req, res) => {
  await labelService.delete(req.params.boardId, req.params.labelId, req.user.id);
  res.status(200).json({ success: true, message: 'Label removida com sucesso' });
});

/** POST /api/cards/:cardId/labels/:labelId */
const addToCard = asyncHandler(async (req, res) => {
  const result = await labelService.addToCard(
    req.params.cardId,
    req.params.labelId,
    req.user.id
  );
  res.status(201).json({ success: true, data: result, message: 'Label adicionada ao card' });
});

/** DELETE /api/cards/:cardId/labels/:labelId */
const removeFromCard = asyncHandler(async (req, res) => {
  await labelService.removeFromCard(
    req.params.cardId,
    req.params.labelId,
    req.user.id
  );
  res.status(200).json({ success: true, message: 'Label removida do card' });
});

module.exports = { list, create, update, remove, addToCard, removeFromCard };
