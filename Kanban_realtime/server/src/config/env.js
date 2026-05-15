// =============================================
// Configuração de Variáveis de Ambiente
// =============================================

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  // Servidor
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Banco de Dados
  DATABASE_URL: process.env.DATABASE_URL,

  // JWT — sem fallbacks hardcoded para secrets
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL,

  // Helpers
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};

// ADICIONADO: Fail-fast — não permite iniciar sem secrets configurados
// Em desenvolvimento isso nunca dispara se o .env estiver correto.
// Em produção previne deploy acidental sem segredos.
if (!env.JWT_SECRET) {
  throw new Error(
    '[FATAL] JWT_SECRET não está definido no .env.\n' +
    'O servidor não pode iniciar sem esta variável de segurança configurada.\n' +
    'Verifique o arquivo .env ou as variáveis de ambiente do container/servidor.'
  );
}

if (!env.JWT_REFRESH_SECRET) {
  throw new Error(
    '[FATAL] JWT_REFRESH_SECRET não está definido no .env.\n' +
    'O servidor não pode iniciar sem esta variável de segurança configurada.'
  );
}

module.exports = env;
