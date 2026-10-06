// =============================================
// Módulo Column — Validação com Zod
// =============================================

const { z } = require('zod');

const createColumnSchema = z.object({
  name: z
    .string({ required_error: 'Nome da coluna é obrigatório' })
    .min(1, 'Nome da coluna não pode ser vazio')
    .max(50, 'Nome da coluna deve ter no máximo 50 caracteres')
    .trim(),
});

const updateColumnSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome da coluna não pode ser vazio')
    .max(50, 'Nome da coluna deve ter no máximo 50 caracteres')
    .trim()
    .optional(),
});

const reorderColumnsSchema = z.object({
  columns: z.array(
    z.object({
      id: z.string().uuid('ID inválido'),
      position: z.number().int().min(0, 'Posição deve ser >= 0'),
    })
  ).min(1, 'É necessário pelo menos uma coluna'),
});

module.exports = { createColumnSchema, updateColumnSchema, reorderColumnsSchema };
