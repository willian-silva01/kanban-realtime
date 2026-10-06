const asyncHandler = require('../../utils/asyncHandler');
const checklistService = require('./checklist.service');
const {
  createChecklistSchema,
  updateChecklistSchema,
  createItemSchema,
  updateItemSchema,
  reorderItemsSchema,
} = require('./checklist.validation');

/** GET /api/cards/:cardId/checklists */
const getByCard = asyncHandler(async (req, res) => {
  const checklists = await checklistService.getByCard(req.params.cardId, req.user.id);
  res.json({ success: true, data: checklists });
});

/** POST /api/cards/:cardId/checklists */
const create = asyncHandler(async (req, res) => {
  const data = createChecklistSchema.parse(req.body);
  const { checklist } = await checklistService.create(req.params.cardId, req.user.id, data);
  res.status(201).json({ success: true, data: checklist, message: 'Checklist criada' });
});

/** PUT /api/checklists/:checklistId */
const update = asyncHandler(async (req, res) => {
  const data = updateChecklistSchema.parse(req.body);
  const { checklist } = await checklistService.update(req.params.checklistId, req.user.id, data);
  res.json({ success: true, data: checklist, message: 'Checklist atualizada' });
});

/** DELETE /api/checklists/:checklistId */
const remove = asyncHandler(async (req, res) => {
  await checklistService.delete(req.params.checklistId, req.user.id);
  res.json({ success: true, message: 'Checklist removida' });
});

/** POST /api/checklists/:checklistId/items */
const addItem = asyncHandler(async (req, res) => {
  const data = createItemSchema.parse(req.body);
  const { item } = await checklistService.addItem(req.params.checklistId, req.user.id, data);
  res.status(201).json({ success: true, data: item, message: 'Item adicionado' });
});

/** PATCH /api/checklists/:checklistId/items/:itemId */
const updateItem = asyncHandler(async (req, res) => {
  const data = updateItemSchema.parse(req.body);
  const { item } = await checklistService.updateItem(
    req.params.checklistId,
    req.params.itemId,
    req.user.id,
    data
  );
  res.json({ success: true, data: item, message: 'Item atualizado' });
});

/** DELETE /api/checklists/:checklistId/items/:itemId */
const removeItem = asyncHandler(async (req, res) => {
  await checklistService.deleteItem(
    req.params.checklistId,
    req.params.itemId,
    req.user.id
  );
  res.json({ success: true, message: 'Item removido' });
});

/** PATCH /api/checklists/:checklistId/items (reorder) */
const reorderItems = asyncHandler(async (req, res) => {
  const { itemIds } = reorderItemsSchema.parse(req.body);
  const { items } = await checklistService.reorderItems(
    req.params.checklistId,
    req.user.id,
    itemIds
  );
  res.json({ success: true, data: items, message: 'Itens reordenados' });
});

module.exports = { getByCard, create, update, remove, addItem, updateItem, removeItem, reorderItems };
