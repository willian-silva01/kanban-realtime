const { z } = require('zod');

const createWorkspaceSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome não pode ser vazio')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
});

const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome não pode ser vazio')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim()
    .optional(),
});

const addWorkspaceMemberSchema = z.object({
  email: z
    .string({ required_error: 'Email do membro é obrigatório' })
    .email('Email inválido'),
  role: z
    .enum(['admin', 'member'], {
      errorMap: () => ({ message: 'Role deve ser: admin ou member' }),
    })
    .default('member'),
});

module.exports = { createWorkspaceSchema, updateWorkspaceSchema, addWorkspaceMemberSchema };
