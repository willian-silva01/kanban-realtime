// =============================================
// Módulo Card — Validação com Zod
// =============================================

const { z } = require('zod');

const createCardSchema = z.object({
  title: z
    .string({ required_error: 'Título do card é obrigatório' })
    .min(1, 'Título do card não pode ser vazio')
    .max(200, 'Título do card deve ter no máximo 200 caracteres')
    .trim(),
  description: z
    .string()
    .max(5000, 'Descrição deve ter no máximo 5000 caracteres')
    .trim()
    .nullable()
    .optional(),
});

const updateCardSchema = z.object({
  title: z
    .string()
    .min(1, 'Título do card não pode ser vazio')
    .max(200, 'Título do card deve ter no máximo 200 caracteres')
    .trim()
    .optional(),
  description: z
    .string()
    .max(5000, 'Descrição deve ter no máximo 5000 caracteres')
    .trim()
    .nullable()
    .optional(),
  dueDate: z
    .string()
    .datetime({ offset: true, message: 'Data de vencimento inválida' })
    .nullable()
    .optional(),
});

const moveCardSchema = z.object({
  toColumnId: z
    .string({ required_error: 'ID da coluna destino é obrigatório' })
    .uuid('ID da coluna destino inválido'),
  newPosition: z
    .number({ required_error: 'Nova posição é obrigatória' })
    .int()
    .min(0, 'Posição deve ser >= 0'),
});

module.exports = { createCardSchema, updateCardSchema, moveCardSchema };
