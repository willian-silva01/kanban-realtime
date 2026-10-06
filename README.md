# Kanban Realtime

Quadro Kanban colaborativo em tempo real onde equipes trabalham simultaneamente no mesmo board sem latência.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io)](https://socket.io)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)](https://www.prisma.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose)

---

## Visão Geral

O Kanban Realtime é uma plataforma de gerenciamento de tarefas inspirada no Trello, construída com foco em sincronização em tempo real. Múltiplos usuários podem mover cartões, criar colunas e ver os cursores uns dos outros ao vivo — com alterações refletidas instantaneamente em todos os clientes conectados via WebSocket.

**Diferenciais principais:**
- Rastreamento de cursores ao vivo com throttle de 50ms
- Atualizações otimistas com broadcast no servidor (excluindo o emissor)
- Camada de presença in-memory pronta para migração para Redis
- Autenticação JWT nas camadas REST e WebSocket (RBAC)

---

## Stack Tecnológico

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, @dnd-kit, Axios |
| Estado | React Context → Zustand (planejado) |
| Backend | Node.js, Express 4, validação com Zod |
| WebSocket | Socket.IO 4 com autenticação JWT no handshake |
| ORM | Prisma 6 |
| Banco de Dados | PostgreSQL 16 |
| Autenticação | JWT (access 15min + refresh 7d), Bcrypt |
| Segurança | Helmet, CORS, rate limiting |
| Infraestrutura | Docker Compose |

---

## Funcionalidades

**Colaboração em tempo real** — sincronização de boards, colunas e cartões via WebSocket, presença, cursores ao vivo, indicador "Editando agora", painel de atividades, reconexão com resync e fila offline.

**Cartões** — drag-and-drop, labels, data de vencimento com lembretes, responsáveis, checklists, descrição em Markdown, comentários com menções e reações, arquivamento.

**Organização** — workspaces, templates de board, busca e filtros globais, exportação CSV/PDF, atalhos de teclado.

**Plataforma** — autenticação JWT com refresh automático, RBAC, rate limiting, Helmet, CORS restritivo, notificações in-app e por e-mail, modo escuro, layout responsivo, Redis para presença distribuída, CI/CD com GitHub Actions e Docker.

O histórico por versão está no [CHANGELOG](CHANGELOG.md) e o que vem a seguir no [ROADMAP](ROADMAP.md).

---

## Estrutura do Projeto

```
kanban-realtime/
├── server/                  # API Node.js + Express
│   ├── src/
│   │   ├── config/          # Configuração de banco e ambiente
│   │   ├── middleware/       # Tratamento de erros, autenticação
│   │   ├── modules/         # Módulos de funcionalidades (auth, board, card, column, ...)
│   │   │   └── <modulo>/
│   │   │       ├── *.controller.js
│   │   │       ├── *.service.js
│   │   │       ├── *.routes.js
│   │   │       └── *.validation.js
│   │   ├── utils/           # ApiError, asyncHandler, logger
│   │   └── websocket/       # Gateway Socket.IO, handlers, presença
│   ├── prisma/              # Schema e client do Prisma
│   └── .env.example
├── web/                     # Frontend React + Vite
│   └── src/
│       ├── components/      # Board, Card, Column, Notificações, ...
│       ├── contexts/        # AuthContext
│       ├── pages/           # Login, Registro, Dashboard
│       ├── services/        # Cliente Axios (com refresh automático)
│       ├── stores/          # Estado global (Zustand)
│       └── utils/           # Exportação CSV/PDF, helpers
├── docs/                    # PRDs e modelagem do sistema
├── scripts/qa/              # Testes manuais de realtime com múltiplos usuários
├── .github/                 # CI/CD, templates de issue e PR
├── CHANGELOG.md
├── CONTRIBUTING.md
├── ROADMAP.md
├── docker-compose.yml       # Postgres + Redis para desenvolvimento
└── docker-compose.prod.yml
```

---

## Como Executar

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- Git

### 1. Clonar o repositório

```bash
git clone git@github.com:willian-silva01/kanban-realtime.git
cd kanban-realtime
```

### 2. Subir o banco de dados

```bash
docker-compose up -d
```

### 3. Configurar o backend

```bash
cd server
cp .env.example .env
# Edite o .env com seus valores
npm install
npx prisma migrate dev
npm run dev
```

### 4. Configurar o frontend

```bash
cd web
npm install
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.  
A API roda em `http://localhost:3000`.

---

## Variáveis de Ambiente

Veja [`server/.env.example`](server/.env.example) para todas as variáveis necessárias.

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_SECRET` | Segredo do token de acesso (mín. 32 caracteres) |
| `JWT_EXPIRES_IN` | TTL do token de acesso (padrão: `15m`) |
| `JWT_REFRESH_SECRET` | Segredo do refresh token |
| `JWT_REFRESH_EXPIRES_IN` | TTL do refresh token (padrão: `7d`) |
| `PORT` | Porta do servidor (padrão: `3000`) |

---

## Visão Geral da API

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Registrar novo usuário |
| POST | `/api/auth/login` | Login e obtenção de tokens |
| POST | `/api/auth/refresh` | Renovar token de acesso |
| POST | `/api/auth/logout` | Encerrar sessão |

### Boards
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/boards` | Listar boards do usuário |
| POST | `/api/boards` | Criar board |
| GET | `/api/boards/:id` | Buscar board com colunas e cartões |
| PATCH | `/api/boards/:id` | Atualizar board |
| DELETE | `/api/boards/:id` | Deletar board |

### Colunas / Cartões / Comentários / Atividades
Rotas CRUD padrão em `/api/columns`, `/api/cards`, `/api/comments`, `/api/activities`.

### Eventos WebSocket

| Evento | Direção | Payload |
|---|---|---|
| `board:join` | Cliente → Servidor | `{ boardId }` |
| `board:leave` | Cliente → Servidor | `{ boardId }` |
| `card:moved` | Broadcast | `{ cardId, columnId, position }` |
| `card:created` | Broadcast | `{ card, columnId }` |
| `column:created` | Broadcast | `{ column }` |
| `cursor:move` | Broadcast | `{ userId, x, y }` |
| `presence:update` | Broadcast | `{ users[] }` |
| `activity:new` | Broadcast | `{ activity }` |
| `notification:new` | Broadcast | `{ notification }` |

---

## Documentação

- [PRD v1 — Kanban Realtime](docs/PRD-v1-kanban-realtime.md)
- [PRD v2 — Colunas e sincronização WebSocket](docs/PRD-v2-colunas-websocket.md)
- [Modelagem do Sistema](docs/01-modelagem-sistema.md)
- [Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md)

---

## Contribuindo

O fluxo de branches, commits, Definition of Done, labels e releases está no [CONTRIBUTING](CONTRIBUTING.md).

---

## Licença

MIT
