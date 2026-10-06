// =============================================
// MÃ³dulo Card â€” Controller
// =============================================

const asyncHandler = require('../../utils/asyncHandler');
const cardService = require('./card.service');
const { createCardSchema, updateCardSchema, moveCardSchema } = require('./card.validation');

/**
 * GET /api/columns/:columnId/cards
 */
const list = asyncHandler(async (req, res) => {
  const cards = await cardService.listByColumn(req.params.columnId, req.user.id);

  res.status(200).json({
    success: true,
    data: cards,
  });
});

/**
 * POST /api/columns/:columnId/cards
 */
const create = asyncHandler(async (req, res) => {
  const data = createCardSchema.parse(req.body);
  const card = await cardService.create(req.params.columnId, req.user.id, data);

  res.status(201).json({
    success: true,
    data: card,
    message: 'Card criado com sucesso',
  });
});

/**
 * GET /api/cards/:id
 */
const getById = asyncHandler(async (req, res) => {
  const card = await cardService.getById(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: card,
  });
});

/**
 * PUT /api/cards/:id
 */
const update = asyncHandler(async (req, res) => {
  const data = updateCardSchema.parse(req.body);
  const card = await cardService.update(req.params.id, req.user.id, data);

  res.status(200).json({
    success: true,
    data: card,
    message: 'Card atualizado com sucesso',
  });
});

/**
 * DELETE /api/cards/:id
 */
const remove = asyncHandler(async (req, res) => {
  await cardService.delete(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Card removido com sucesso',
  });
});

/**
 * PATCH /api/cards/:id/move
 */
const move = asyncHandler(async (req, res) => {
  const data = moveCardSchema.parse(req.body);
  const result = await cardService.move(req.params.id, req.user.id, data);

  res.status(200).json({
    success: true,
    data: result,
    message: 'Card movido com sucesso',
  });
});

/**
 * POST /api/cards/:id/archive
 */
const archive = asyncHandler(async (req, res) => {
  const card = await cardService.archive(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: card, message: 'Card arquivado com sucesso' });
});

/**
 * POST /api/cards/:id/unarchive
 */
const unarchive = asyncHandler(async (req, res) => {
  const card = await cardService.unarchive(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: card, message: 'Card restaurado com sucesso' });
});

module.exports = { list, create, getById, update, remove, move, archive, unarchive };

