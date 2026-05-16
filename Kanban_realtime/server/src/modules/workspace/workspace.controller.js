const asyncHandler = require('../../utils/asyncHandler');
const workspaceService = require('./workspace.service');
const {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addWorkspaceMemberSchema,
} = require('./workspace.validation');

const list = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.listByUser(req.user.id);
  res.status(200).json({ success: true, data: workspaces });
});

const create = asyncHandler(async (req, res) => {
  const data = createWorkspaceSchema.parse(req.body);
  const workspace = await workspaceService.create(req.user.id, data);
  res.status(201).json({ success: true, data: workspace, message: 'Workspace criado com sucesso' });
});

const getById = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.getById(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: workspace });
});

const update = asyncHandler(async (req, res) => {
  const data = updateWorkspaceSchema.parse(req.body);
  const workspace = await workspaceService.update(req.params.id, req.user.id, data);
  res.status(200).json({ success: true, data: workspace, message: 'Workspace atualizado com sucesso' });
});

const remove = asyncHandler(async (req, res) => {
  await workspaceService.delete(req.params.id, req.user.id);
  res.status(200).json({ success: true, message: 'Workspace removido com sucesso' });
});

const listBoards = asyncHandler(async (req, res) => {
  const boards = await workspaceService.listBoards(req.params.id, req.user.id);
  res.status(200).json({ success: true, data: boards });
});

const addMember = asyncHandler(async (req, res) => {
  const data = addWorkspaceMemberSchema.parse(req.body);
  const member = await workspaceService.addMember(req.params.id, req.user.id, data);
  res.status(201).json({ success: true, data: member, message: 'Membro adicionado com sucesso' });
});

const removeMember = asyncHandler(async (req, res) => {
  await workspaceService.removeMember(req.params.id, req.user.id, req.params.uid);
  res.status(200).json({ success: true, message: 'Membro removido com sucesso' });
});

module.exports = { list, create, getById, update, remove, listBoards, addMember, removeMember };
