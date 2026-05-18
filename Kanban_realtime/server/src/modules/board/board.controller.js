// =============================================
// Módulo Board — Controller
// =============================================

const asyncHandler = require('../../utils/asyncHandler');
const boardService = require('./board.service');
const { createBoardSchema, updateBoardSchema, addMemberSchema } = require('./board.validation');

/**
 * GET /api/boards
 */
const list = asyncHandler(async (req, res) => {
  const boards = await boardService.listByUser(req.user.id);

  res.status(200).json({
    success: true,
    data: boards,
  });
});

/**
 * POST /api/boards
 */
const create = asyncHandler(async (req, res) => {
  const data = createBoardSchema.parse(req.body);
  const board = await boardService.create(req.user.id, data);

  res.status(201).json({
    success: true,
    data: board,
    message: 'Board criado com sucesso',
  });
});

/**
 * GET /api/boards/:id
 */
const getById = asyncHandler(async (req, res) => {
  const board = await boardService.getById(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    data: board,
  });
});

/**
 * PUT /api/boards/:id
 */
const update = asyncHandler(async (req, res) => {
  const data = updateBoardSchema.parse(req.body);
  const board = await boardService.update(req.params.id, req.user.id, data);

  res.status(200).json({
    success: true,
    data: board,
    message: 'Board atualizado com sucesso',
  });
});

/**
 * DELETE /api/boards/:id
 */
const remove = asyncHandler(async (req, res) => {
  await boardService.delete(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Board removido com sucesso',
  });
});

/**
 * POST /api/boards/:id/members
 */
const addMember = asyncHandler(async (req, res) => {
  const data = addMemberSchema.parse(req.body);
  const member = await boardService.addMember(req.params.id, req.user.id, data);

  res.status(201).json({
    success: true,
    data: member,
    message: 'Membro adicionado com sucesso',
  });
});

/**
 * DELETE /api/boards/:id/members/:uid
 */
const removeMember = asyncHandler(async (req, res) => {
  await boardService.removeMember(req.params.id, req.user.id, req.params.uid);

  res.status(200).json({
    success: true,
    message: 'Membro removido com sucesso',
  });
});

/**
 * POST /api/boards/:id/archive
 */
const archive = asyncHandler(async (req, res) => {
  const board = await boardService.archive(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: board, message: 'Board arquivado com sucesso' });
});

/**
 * POST /api/boards/:id/unarchive
 */
const unarchive = asyncHandler(async (req, res) => {
  const board = await boardService.unarchive(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: board, message: 'Board restaurado com sucesso' });
});

/**
 * GET /api/boards/archived
 */
const listArchived = asyncHandler(async (req, res) => {
  const boards = await boardService.listArchivedByUser(req.user.id);
  res.status(200).json({ success: true, data: boards });
});

/**
 * GET /api/boards/:id/archived-cards
 */
const listArchivedCards = asyncHandler(async (req, res) => {
  const cards = await boardService.listArchivedCards(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: cards });
});

module.exports = { list, create, getById, update, remove, addMember, removeMember, archive, unarchive, listArchived, listArchivedCards };
