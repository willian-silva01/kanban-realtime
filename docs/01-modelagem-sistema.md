# Etapa 1 — Modelagem Completa do Sistema

## Realtime Kanban

> Sistema de Kanban colaborativo em tempo real com WebSocket, inspirado no Trello.
> Documento de referência para desenvolvimento de todas as etapas.

---

Consulte o documento completo no artefato principal.
Este arquivo serve como referência no repositório do projeto.

## Stack Tecnológica

- **Frontend:** React 18 + Vite + Zustand + @dnd-kit + CSS Modules
- **Backend:** Node.js + Express + Socket.IO + Prisma
- **Banco:** PostgreSQL
- **Cache/PubSub:** Redis
- **Auth:** JWT (Access + Refresh Token)
- **Validação:** Zod (compartilhada front/back)

## Entidades

- User, Board, BoardMember, Column, Card, ActivityLog

## Roadmap

1. ✅ Modelagem do sistema
2. ✅ Estrutura inicial do projeto (Backend + DB + APIs)
3. Sistema de autenticação (Frontend)
4. CRUD de boards (Frontend)
5. CRUD de colunas (Frontend)
6. CRUD de cards (Frontend)
7. WebSocket Gateway
8. Sincronização realtime
9. Drag and drop
10. Recursos avançados
