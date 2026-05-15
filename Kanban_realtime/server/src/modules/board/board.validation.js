// =============================================
// Módulo Board — Validação com Zod
// =============================================

const { z } = require('zod');

const createBoardSchema = z.object({
  name: z
    .string({ required_error: 'Nome do board é obrigatório' })
    .min(1, 'Nome do board não pode ser vazio')
    .max(100, 'Nome do board deve ter no máximo 100 caracteres')
    .trim(),
});

const updateBoardSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do board não pode ser vazio')
    .max(100, 'Nome do board deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
});

const addMemberSchema = z.object({
  email: z
    .string({ required_error: 'Email do membro é obrigatório' })
    .email('Email inválido'),
  role: z
    .enum(['admin', 'editor', 'viewer'], {
      errorMap: () => ({ message: 'Role deve ser: admin, editor ou viewer' }),
    })
    .default('editor'),
});

module.exports = { createBoardSchema, updateBoardSchema, addMemberSchema };
