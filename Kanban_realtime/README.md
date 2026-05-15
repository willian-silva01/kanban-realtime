# Kanban Realtime

A real-time collaborative Kanban board where teams work simultaneously on the same board without latency.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?logo=socket.io)](https://socket.io)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)](https://www.prisma.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose)

---

## Overview

Kanban Realtime is a task management platform inspired by Trello, built with a focus on real-time synchronization. Multiple users can move cards, create columns, and see each other's cursors live — with changes reflected instantly across all connected clients via WebSocket.

**Key differentiators:**
- Live cursor tracking with 50ms throttle
- Optimistic updates with server-side broadcast (excluding emitter)
- In-memory presence layer ready for Redis migration
- JWT authentication at both REST and WebSocket layers (RBAC)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, @dnd-kit, Axios |
| State | React Context → Zustand (planned) |
| Backend | Node.js, Express 4, Zod validation |
| WebSocket | Socket.IO 4 with JWT handshake auth |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Auth | JWT (access 15m + refresh 7d), Bcrypt |
| Security | Helmet, CORS, rate limiting |
| Infra | Docker Compose |

---

## Features

### Implemented
- [x] Board management (create, list, delete) with RBAC
- [x] Columns and cards with real-time drag-and-drop
- [x] Live cursor tracking per board session
- [x] User presence (who is online on the board)
- [x] Activity feed with real-time broadcast
- [x] Comments per card with real-time sync
- [x] In-app notifications (NotificationBell)
- [x] JWT authentication with access + refresh tokens
- [x] Rate limiting and Helmet security headers

### Roadmap (see [PRD](docs/PRD-kanban-realtime-v1.md))
- [ ] Labels / tags on cards (P0)
- [ ] Due dates with visual indicators (P0)
- [ ] Member assignment to cards (P0)
- [ ] JWT token refresh interceptor (P0)
- [ ] WebSocket reconnection with state resync (P0)
- [ ] Redis for distributed presence (P0)
- [ ] Zustand state management (P1)
- [ ] Checklists on cards (P1)
- [ ] Markdown descriptions (P1)
- [ ] Global board search and filters (P1)
- [ ] Workspaces (P1)
- [ ] E-mail notifications (P1)
- [ ] CI/CD pipeline with GitHub Actions (P1)

---

## Project Structure

```
kanban-realtime/
├── server/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/          # Database and environment config
│   │   ├── middleware/      # Error handling, auth
│   │   ├── modules/         # Feature modules (auth, board, card, column, ...)
│   │   │   └── <module>/
│   │   │       ├── *.controller.js
│   │   │       ├── *.service.js
│   │   │       ├── *.routes.js
│   │   │       └── *.validation.js
│   │   ├── utils/           # ApiError, asyncHandler, logger
│   │   └── websocket/       # Socket.IO gateway, handlers, presence
│   ├── prisma/              # Prisma schema and client
│   └── .env.example
├── web/                     # React + Vite frontend
│   └── src/
│       ├── components/      # Board, Card, Column, Notifications, ...
│       ├── contexts/        # AuthContext
│       ├── pages/           # Login, Register
│       └── services/        # Axios API client
├── shared/                  # Shared types/constants
├── docs/                    # PRD and system modeling
│   ├── PRD-kanban-realtime-v1.md
│   └── 01-modelagem-sistema.md
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Git

### 1. Clone the repository

```bash
git clone git@github.com:willian-silva01/kanban-realtime.git
cd kanban-realtime
```

### 2. Start the database

```bash
docker-compose up -d
```

### 3. Configure the backend

```bash
cd server
cp .env.example .env
# Edit .env with your values
npm install
npx prisma migrate dev
npm run dev
```

### 4. Configure the frontend

```bash
cd web
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.  
The API runs on `http://localhost:3000`.

---

## Environment Variables

See [`server/.env.example`](server/.env.example) for all required variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token secret (min 32 chars) |
| `JWT_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default: `7d`) |
| `PORT` | Server port (default: `3000`) |

---

## API Overview

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate session |

### Boards
| Method | Route | Description |
|---|---|---|
| GET | `/api/boards` | List user boards |
| POST | `/api/boards` | Create board |
| GET | `/api/boards/:id` | Get board with columns and cards |
| PATCH | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |

### Columns / Cards / Comments / Activity
Standard CRUD routes under `/api/columns`, `/api/cards`, `/api/comments`, `/api/activities`.

### WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `board:join` | Client → Server | `{ boardId }` |
| `board:leave` | Client → Server | `{ boardId }` |
| `card:moved` | Broadcast | `{ cardId, columnId, position }` |
| `card:created` | Broadcast | `{ card, columnId }` |
| `column:created` | Broadcast | `{ column }` |
| `cursor:move` | Broadcast | `{ userId, x, y }` |
| `presence:update` | Broadcast | `{ users[] }` |
| `activity:new` | Broadcast | `{ activity }` |
| `notification:new` | Broadcast | `{ notification }` |

---

## Documentation

- [Product Requirements Document (PRD)](docs/PRD-kanban-realtime-v1.md)
- [System Modeling](docs/01-modelagem-sistema.md)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit following [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `chore:`
4. Open a Pull Request targeting `main`

---

## License

MIT
