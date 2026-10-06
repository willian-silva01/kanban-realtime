const { z } = require('zod');

const addAssigneeSchema = z.object({
  userId: z.string().uuid('userId deve ser um UUID válido'),
});

module.exports = { addAssigneeSchema };
