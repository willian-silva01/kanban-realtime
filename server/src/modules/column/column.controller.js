// =============================================
// MÃ³dulo Column â€” Controller
// =============================================

const asyncHandler = require('../../utils/asyncHandler');
const columnService = require('./column.service');
const { createColumnSchema, updateColumnSchema, reorderColumnsSchema } = require('./column.validation');

/**
 * GET /api/boards/:boardId/columns
 */
const list = asyncHandler(async (req, res) => {
  const columns = await columnService.listByBoard(req.params.boardId, req.user.id);

  res.status(200).json({
    success: true,
    data: columns,
  });
});

/**
 * POST /api/boards/:boardId/columns
 */
const create = asyncHandler(async (req, res) => {
  const data = createColumnSchema.parse(req.body);
  const column = await columnService.create(req.params.boardId, req.user.id, data);

  res.status(201).json({
    success: true,
    data: column,
    message: 'Coluna criada com sucesso',
  });
});

/**
 * PUT /api/boards/:boardId/columns/:id
 */
const update = asyncHandler(async (req, res) => {
  const data = updateColumnSchema.parse(req.body);
  const column = await columnService.update(req.params.boardId, req.params.id, req.user.id, data);

  res.status(200).json({
    success: true,
    data: column,
    message: 'Coluna atualizada com sucesso',
  });
});

/**
 * DELETE /api/boards/:boardId/columns/:id
 */
const remove = asyncHandler(async (req, res) => {
  await columnService.delete(req.params.boardId, req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Coluna removida com sucesso',
  });
});

/**
 * PATCH /api/boards/:boardId/columns/reorder
 */
const reorder = asyncHandler(async (req, res) => {
  const data = reorderColumnsSchema.parse(req.body);
  const columns = await columnService.reorder(req.params.boardId, req.user.id, data);

  res.status(200).json({
    success: true,
    data: columns,
    message: 'Colunas reordenadas com sucesso',
  });
});

module.exports = { list, create, update, remove, reorder };

