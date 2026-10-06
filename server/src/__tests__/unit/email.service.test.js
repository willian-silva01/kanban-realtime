jest.mock('../../config/database', () => ({
  emailLog: { findFirst: jest.fn(), create: jest.fn() },
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const prisma = require('../../config/database');
const logger = require('../../utils/logger');
const nodemailer = require('nodemailer');
const env = require('../../config/env');
const emailService = require('../../modules/email/email.service');

const ORIGINAL = { SMTP_HOST: env.SMTP_HOST, APP_URL: env.APP_URL, isDev: env.isDev };

const MENTION = {
  toEmail: 'bob@qa.com',
  toName: 'Bob',
  toUserId: 'user-2',
  mentionedBy: 'Ana',
  cardTitle: 'Card',
  boardName: 'Board',
  commentContent: 'oi @[user-2]',
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(env, ORIGINAL);
  emailService._transporter = null;
});

afterAll(() => Object.assign(env, ORIGINAL));

describe('EmailService.logStatus', () => {
  it('avisa no startup quando SMTP_HOST não está configurado', () => {
    env.SMTP_HOST = null;

    emailService.logStatus();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('DESABILITADO'));
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('informa host e porta quando SMTP está habilitado', () => {
    env.SMTP_HOST = 'smtp.exemplo.com';
    env.APP_URL = 'https://api.exemplo.com';

    emailService.logStatus();

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('smtp.exemplo.com'));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('avisa fora de desenvolvimento quando APP_URL falta (links de descadastro)', () => {
    env.SMTP_HOST = 'smtp.exemplo.com';
    env.APP_URL = null;
    env.isDev = false;

    emailService.logStatus();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('APP_URL'));
  });
});

describe('EmailService com SMTP desabilitado', () => {
  it('não consulta o banco nem cria transporter ao tentar enviar', async () => {
    env.SMTP_HOST = null;

    await emailService.sendMentionEmail(MENTION);

    expect(prisma.emailLog.findFirst).not.toHaveBeenCalled();
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
});

describe('EmailService com SMTP habilitado', () => {
  it('envia e registra o envio quando não há e-mail recente', async () => {
    env.SMTP_HOST = 'smtp.exemplo.com';
    const sendMail = jest.fn().mockResolvedValue({});
    nodemailer.createTransport.mockReturnValue({ sendMail });
    prisma.emailLog.findFirst.mockResolvedValue(null);

    await emailService.sendMentionEmail(MENTION);

    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: '"Bob" <bob@qa.com>' }));
    expect(prisma.emailLog.create).toHaveBeenCalled();
  });

  it('respeita o rate limit quando já houve envio recente', async () => {
    env.SMTP_HOST = 'smtp.exemplo.com';
    const sendMail = jest.fn();
    nodemailer.createTransport.mockReturnValue({ sendMail });
    prisma.emailLog.findFirst.mockResolvedValue({ id: 'log-1' });

    await emailService.sendMentionEmail(MENTION);

    expect(sendMail).not.toHaveBeenCalled();
  });
});
