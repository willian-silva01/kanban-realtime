const { z } = require('zod');

const createChecklistSchema = z.object({
  title: z.string().min(1).max(100),
});

const updateChecklistSchema = z.object({
  title: z.string().min(1).max(100),
});

const createItemSchema = z.object({
  text: z.string().min(1).max(500),
});

const updateItemSchema = z
  .object({
    text: z.string().min(1).max(500).optional(),
    completed: z.boolean().optional(),
  })
  .refine((d) => d.text !== undefined || d.completed !== undefined, {
    message: 'Informe text ou completed',
  });

const reorderItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()),
});

module.exports = {
  createChecklistSchema,
  updateChecklistSchema,
  createItemSchema,
  updateItemSchema,
  reorderItemsSchema,
};
