// =============================================
// Módulo Auth — Controller
// =============================================

const asyncHandler = require('../../utils/asyncHandler');
const authService = require('./auth.service');
const { registerSchema, loginSchema } = require('./auth.validation');
const env = require('../../config/env');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProd,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
};

exports.register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.register(data);

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({ user, accessToken });
});

exports.login = asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.login(data);

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ user, accessToken });
});

exports.refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  const { user, accessToken, refreshToken: newRefreshToken } = await authService.refresh(refreshToken);

  res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(200).json({ user, accessToken });
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict',
  });
  res.status(200).json({ message: 'Logout realizado com sucesso' });
});
