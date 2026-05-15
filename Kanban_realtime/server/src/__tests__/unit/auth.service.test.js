jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../modules/user/user.repository');
jest.mock('../../modules/user/user.service');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../../modules/user/user.repository');
const userService = require('../../modules/user/user.service');
const authService = require('../../modules/auth/auth.service');
const ApiError = require('../../utils/ApiError');

const SAFE_USER = { id: 'user-1', email: 'test@test.com', name: 'Test' };

beforeEach(() => jest.clearAllMocks());

describe('AuthService.register', () => {
  it('deve criar usuário e retornar tokens', async () => {
    bcrypt.genSalt.mockResolvedValue('salt');
    bcrypt.hash.mockResolvedValue('hashed');
    userService.createUser.mockResolvedValue(SAFE_USER);
    jwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

    const result = await authService.register({ name: 'Test', email: 'test@test.com', password: 'senha123' });

    expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
    expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 'salt');
    expect(userService.createUser).toHaveBeenCalledWith({
      name: 'Test',
      email: 'test@test.com',
      passwordHash: 'hashed',
    });
    expect(result).toEqual({ user: SAFE_USER, accessToken: 'access-token', refreshToken: 'refresh-token' });
  });
});

describe('AuthService.login', () => {
  it('deve retornar tokens para credenciais válidas', async () => {
    const mockUser = { passwordHash: 'hashed', toSafeObject: () => SAFE_USER };
    userRepository.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('token');

    const result = await authService.login({ email: 'test@test.com', password: 'senha123' });

    expect(result.accessToken).toBe('token');
    expect(result.user).toEqual(SAFE_USER);
  });

  it('deve lançar INVALID_CREDENTIALS para email não encontrado', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(authService.login({ email: 'x@x.com', password: 'senha' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
  });

  it('deve lançar INVALID_CREDENTIALS para senha incorreta', async () => {
    const mockUser = { passwordHash: 'hashed', toSafeObject: jest.fn() };
    userRepository.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(authService.login({ email: 'x@x.com', password: 'errado' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', statusCode: 401 });
  });
});

describe('AuthService.refresh', () => {
  it('deve lançar REFRESH_TOKEN_MISSING quando token não fornecido', async () => {
    await expect(authService.refresh(undefined))
      .rejects.toMatchObject({ code: 'REFRESH_TOKEN_MISSING', statusCode: 401 });
  });

  it('deve lançar REFRESH_TOKEN_EXPIRED para token expirado', async () => {
    const expiredError = new Error('expired');
    expiredError.name = 'TokenExpiredError';
    jwt.verify.mockImplementation(() => { throw expiredError; });

    await expect(authService.refresh('expired-token'))
      .rejects.toMatchObject({ code: 'REFRESH_TOKEN_EXPIRED' });
  });

  it('deve lançar REFRESH_TOKEN_INVALID para token inválido', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid'); });

    await expect(authService.refresh('invalid-token'))
      .rejects.toMatchObject({ code: 'REFRESH_TOKEN_INVALID' });
  });

  it('deve lançar USER_NOT_FOUND se usuário foi deletado', async () => {
    jwt.verify.mockReturnValue({ id: 'user-1', email: 'test@test.com' });
    userRepository.findById.mockResolvedValue(null);

    await expect(authService.refresh('valid-token'))
      .rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('deve emitir novos tokens para refresh token válido', async () => {
    jwt.verify.mockReturnValue({ id: 'user-1', email: 'test@test.com' });
    userRepository.findById.mockResolvedValue({ toSafeObject: () => SAFE_USER });
    jwt.sign.mockReturnValue('new-token');

    const result = await authService.refresh('valid-token');

    expect(result.accessToken).toBe('new-token');
    expect(result.user).toEqual(SAFE_USER);
  });
});
