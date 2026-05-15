// =============================================
// Módulo Auth — Controller
// =============================================

const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');
const { registerSchema, loginSchema } = require('./auth.validation');

// CORRIGIDO: removida verificação condicional desnecessária (registerSchema ? ...)
// O schema sempre existe após import — se falhar, o processo já teria crashado

exports.register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);

  // Retorna { user, token } diretamente
  res.status(201).json(result);
});

exports.login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);

  // Retorna { user, token } diretamente
  res.status(200).json(result);
});
