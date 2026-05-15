const { z } = require('zod');

const hexColor = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6})$/, 'Cor deve ser um hex válido (#RRGGBB)');

const createLabelSchema = z.object({
  name: z
    .string({ required_error: 'Nome da label é obrigatório' })
    .min(1, 'Nome não pode ser vazio')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .trim(),
  color: hexColor,
});

const updateLabelSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome não pode ser vazio')
    .max(50, 'Nome deve ter no máximo 50 caracteres')
    .trim()
    .optional(),
  color: hexColor.optional(),
});

module.exports = { createLabelSchema, updateLabelSchema };
