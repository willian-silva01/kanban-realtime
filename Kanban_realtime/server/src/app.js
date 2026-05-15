// =============================================
// Kanban Realtime — Entry Point
// =============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Importar rotas
const authRoutes = require('./modules/auth/auth.routes');
const boardRoutes = require('./modules/board/board.routes');
const columnRoutes = require('./modules/column/column.routes');
const { columnCardsRouter, cardsRouter } = require('./modules/card/card.routes');
const activityRoutes = require('./modules/activity/activity.routes');
const commentRoutes = require('./modules/comment/comment.routes');
const notificationRoutes = require('./modules/notification/notification.routes');

// Inicializar o Express
const app = express();

// ─── 1. Middlewares de Segurança Básicos ──────────
// O Helmet assegura headers HTTP robustos (esconde X-Powered-By, aplica HSTS, previne Clickjacking, etc.)
app.use(helmet());

// CORS protegido — Ideal para produção: Permitir acesso apenas via Domínio Oficial
// Se env.FRONTEND_URL estiver vazio, em desenvolvimento cairemos nativamente no '*' para facilitar a depuração.
const corsOptions = {
  origin: env.FRONTEND_URL || '*', 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Necessário caso venha utilizar cookies HttpOnly futuramente
};
app.use(cors(corsOptions));

// ─── 2. Parsing de Cookies e Corpo (`body`) ───────
app.use(cookieParser());

// ─── 2. Parsing de Corpo (`body`) ─────────────────
// Limite estrito de conversão JSON para reduzir a superfície de ataque por 'Payloads imensos'
app.use(express.json({ limit: '50kb' })); 
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── 3. Limite de Sobrecargas (Rate Limiting) ─────

// Limite Global: Modera todo o tráfego estático para a aplicação, travando Spam de Requisições
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos de amostragem
  max: 500, // Limite de 500 requisições por IP na janela estipulada
  standardHeaders: true, // Retorna RateLimit info no final
  legacyHeaders: false, // Desabilita 'X-RateLimit-*' headers obsoletos
  handler: (req, res) => {
    logger.warn(`[RateLimit/Global] IP ${req.ip} excedeu o limite de requisições gerais.`);
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Muitas solicitações deste IP, por favor tente novamente em 15 minutos.',
        statusCode: 429
      }
    });
  }
});
app.use('/api/', globalLimiter);

// Limite Restritivo de Auth: Bloqueia ataques do tipo "Brute-Force" diretamente no Login / Cadastro
const authLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutos
  max: 15, // 15 tentativas brutas de criação/login no IP por janela
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[RateLimit/Auth] IP ${req.ip} excedeu o limite de credenciais.`);
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT',
        message: 'Muitas falhas ou tentativas de autenticação detectadas. Perfil temporariamente bloqueado para validação.',
        statusCode: 429
      }
    });
  }
});


// ─── Health Check ───────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: '1.0.0',
    },
  });
});

// ─── Rotas da API ───────────────────────────
// Rota de Auth usa o Rate-Limit exclusivo anti-bruteforce antes mesmo de processar middleware:
app.use('/api/auth', authLimiter, authRoutes);

// Demais rotas sobem através do GlobalLimiter (já aplicado explicitamente na diretiva 'use' acima)
app.use('/api/boards', boardRoutes);
app.use('/api/boards/:boardId/columns', columnRoutes);
app.use('/api/boards/:boardId/activities', activityRoutes);
app.use('/api/columns/:columnId/cards', columnCardsRouter);
app.use('/api/cards/:cardId/comments', commentRoutes);
app.use('/api/cards', cardsRouter);
app.use('/api/notifications', notificationRoutes);

// ─── Rota 404 ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Rota ${req.method} ${req.path} não encontrada`,
      statusCode: 404,
    },
  });
});

// ─── Error Handler ──────────────────────────
// Capta erros globais após injetar Rate limits/Headers e falhas de controllers
app.use(errorHandler);

// ─── Inicializar Servidor e WebSocket ─────────
const http = require('http');
const { initSocket } = require('./websocket/socket');

const server = http.createServer(app);
initSocket(server);

// ─── Iniciar Servidor ───────────────────────
server.listen(env.PORT, () => {
  logger.info(`🚀 Servidor Kanban Realtime rodando na porta ${env.PORT}`);
  logger.info(`📍 Ambiente: ${env.NODE_ENV}`);
  logger.info(`🔗 URL: http://localhost:${env.PORT}`);
  logger.info(`❤️  Health: http://localhost:${env.PORT}/api/health`);
});

module.exports = app;
