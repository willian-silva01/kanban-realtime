# PRD — Kanban Realtime: Correções e Novas Funcionalidades

**Versão:** 1.0  
**Data:** 2026-05-18  
**Status:** Em revisão  
**Autor:** Willian Silva  
**Stack:** Node.js 20 · React 19 · PostgreSQL 16 · Socket.IO 4 · Zustand 5

---

## Sumário Executivo

O Kanban Realtime é uma aplicação colaborativa full-stack com backend production-ready, 50+ endpoints REST e 30+ eventos WebSocket. A base técnica é sólida: autenticação JWT, RBAC, rate limiting, soft delete, presença de usuários e fila offline.

Dois problemas bloqueiam a usabilidade imediata:

1. **Colunas não podem ser criadas pela UI** — o backend existe (REST + validação + serviço), mas não há nenhum botão ou formulário no frontend para invocar esse endpoint.
2. **Sincronização WebSocket inconsistente** — ao criar uma coluna ou card via API, outros clientes conectados não recebem atualização em tempo real porque o frontend não emite o evento WebSocket após a chamada REST.

Este PRD documenta a correção desses dois problemas como prioridade P0, e detalha melhorias P1/P2 identificadas na análise do código.

---

## 1. Problema

### 1.1 Criação de Colunas (P0 — Bloqueante)

**Situação atual:** O backend (`POST /api/boards/:boardId/columns`) está 100% implementado: validação Zod, controle de acesso por role, posicionamento automático. No frontend, não existe UI. O board mostra as colunas vindas do `board:sync` mas não oferece forma de criar novas.

**Impacto:** O produto é inutilizável sem esta funcionalidade. Boards novos chegam vazios e o usuário não consegue adicionar colunas.

**Causa raiz:** O componente `Board.jsx` não tem o botão "Adicionar coluna" nem o flow de chamada REST + emissão WebSocket.

---

### 1.2 Sincronização WebSocket (P0 — Bloqueante para colaboração)

**Situação atual:** Os eventos WebSocket existem no `board.handler.js` para colunas (`column:create`, `column:update`, `column:reorder`) e cards. O problema está no **padrão de emissão**: o servidor faz relay do que o cliente envia — ou seja, o cliente precisa emitir o evento via socket APÓS a chamada REST para que os outros clientes recebam a atualização.

**Exemplos de comportamento inconsistente observado:**
- Usuário A cria uma coluna → Usuário B não vê (evento nunca emitido)
- Usuário A cria um card → Usuário B pode não ver se o front não emite `card:create`
- Dois usuários editando ao mesmo tempo podem ver estados divergentes

**Causa raiz:** O padrão atual é REST-first + relay-via-WS. Se o frontend chamar a REST mas não emitir o evento WS, ou emitir com payload incompleto, os outros clientes ficam desatualizados. Não há mecanismo server-side de emit automático após mutações REST.

---

## 2. Objetivos

| # | Objetivo | Métrica de sucesso |
|---|---|---|
| O1 | Usuário consegue criar colunas pela UI | 100% das tentativas refletem no board imediatamente |
| O2 | Todos os clientes conectados recebem atualizações em tempo real | Latência < 300ms entre ação e recepção por outros clientes |
| O3 | Estado do board é consistente após reconexão | `board:sync` retorna estado idêntico ao que cada cliente exibe |
| O4 | Novas features melhoram produtividade sem regredir as existentes | 84 backend + 19 frontend testes continuam passando |

---

## 3. Personas

| Persona | Perfil | Necessidade primária |
|---|---|---|
| **Owner** | Cria e gerencia boards | Criar, reorganizar e deletar colunas |
| **Editor** | Trabalha nos cards | Ver mudanças em tempo real sem reload |
| **Viewer** | Acompanha progresso | Estado sempre atualizado, read-only |
| **Admin** | Gerencia membros e workspaces | Controle de acesso e visibilidade |

---

## 4. Escopo

### 4.1 Dentro do escopo (este PRD)

- [P0] Criar coluna pela UI (botão + formulário inline)
- [P0] Deletar coluna pela UI
- [P0] Renomear coluna pela UI
- [P0] Sincronização WebSocket correta para todas as operações de coluna
- [P0] Sincronização WebSocket correta para criação/edição/deleção de card
- [P1] Reordenação de colunas via drag-and-drop (arrastar a coluna inteira)
- [P1] Criação de card emite WS corretamente para todos os clientes
- [P1] Deleção de card emite WS corretamente
- [P1] Painel de atividade recebe atualizações em tempo real via WS
- [P2] Indicador visual de "quem está editando este card agora"
- [P2] CORS do Socket.IO restrito a `FRONTEND_URL` (segurança)
- [P2] Testes de integração WebSocket

### 4.2 Fora do escopo

- Múltiplos boards numa mesma janela (multi-tab sync é tratado pelo `board:sync` na reconexão)
- Migração de banco de dados (schema já está correto)
- Mudanças na arquitetura de autenticação
- Funcionalidades de analytics/métricas de uso

---

## 5. Requisitos Funcionais

### FR-001 — Criar Coluna pela UI [P0]

**User Story:**
> Como owner ou admin do board, quero clicar em "Adicionar coluna" e digitar um nome para que a coluna apareça imediatamente para todos os colaboradores.

**Acceptance Criteria:**
- [ ] Existe um botão "+ Adicionar coluna" visível à direita das colunas existentes
- [ ] Clicar no botão abre um input inline (sem modal) com placeholder "Nome da coluna"
- [ ] Pressionar Enter ou clicar "Confirmar" chama `POST /api/boards/:boardId/columns`
- [ ] Após resposta 201, emite `socket.emit('column:create', { boardId, column })`
- [ ] Todos os outros clientes conectados recebem `column:create` e renderizam a nova coluna sem reload
- [ ] Pressionar Escape cancela a criação sem criar nada
- [ ] Se o usuário for viewer, o botão não é exibido
- [ ] Nomes vazios ou maiores que 50 chars exibem erro inline

---

### FR-002 — Renomear Coluna pela UI [P0]

**User Story:**
> Como admin, quero clicar no título de uma coluna e editá-lo in-place para manter o board organizado.

**Acceptance Criteria:**
- [ ] Duplo clique (ou clique em ícone de edição) no título transforma-o em input
- [ ] Blur ou Enter salva via `PUT /api/boards/:boardId/columns/:id`
- [ ] Após salvar, emite `socket.emit('column:update', { boardId, column })`
- [ ] Todos os clientes recebem `column:update` e atualizam o nome
- [ ] Escape cancela sem salvar
- [ ] Viewers não conseguem editar (botão/double-click desabilitado)

---

### FR-003 — Deletar Coluna pela UI [P0]

**User Story:**
> Como admin, quero remover colunas que não são mais necessárias, com uma confirmação para evitar deleção acidental.

**Acceptance Criteria:**
- [ ] Existe um botão "…" ou menu de contexto no header de cada coluna
- [ ] Menu expõe opção "Deletar coluna"
- [ ] Ao clicar, um diálogo de confirmação é exibido: "Deletar coluna e seus X cards?"
- [ ] Confirmado → chama `DELETE /api/boards/:boardId/columns/:id`
- [ ] Após 200, emite `socket.emit('column:delete', { boardId, columnId })`
- [ ] Todos os clientes removem a coluna e seus cards do estado local
- [ ] Se a coluna tiver cards arquivados, a deleção é bloqueada com mensagem explicativa

---

### FR-004 — Sincronização WebSocket de Colunas [P0]

**User Story:**
> Como editor conectado ao board, quero que qualquer mudança estrutural (criar/renomear/deletar coluna) apareça automaticamente na minha tela sem reload.

**Acceptance Criteria:**
- [ ] `board:sync` é o estado canônico — ao (re)conectar, o estado é sempre correto
- [ ] Eventos `column:create`, `column:update`, `column:delete` atualizam o store Zustand sem reload
- [ ] `boardStore` expõe actions: `addColumn`, `updateColumn`, `removeColumn`
- [ ] Listeners WS são registrados/desregistrados corretamente no `useEffect` do Board.jsx
- [ ] Reordenação de colunas via drag-and-drop emite `column:reorder` após chamar REST

---

### FR-005 — Sincronização WebSocket de Cards [P0]

**User Story:**
> Como membro do board, quero que cards criados, editados ou deletados por outros apareçam na minha tela em tempo real.

**Acceptance Criteria:**
- [ ] Criar card: REST `POST /api/columns/:columnId/cards` → emite `card:create` → outros clientes adicionam ao store
- [ ] Deletar card: REST `DELETE /api/cards/:id` → emite `card:delete` → outros clientes removem do store
- [ ] Editar título/descrição: REST `PUT /api/cards/:id` → emite `card:update` → outros clientes atualizam
- [ ] `boardStore` já tem `addCard` — validar que é chamado corretamente ao receber `card:create`
- [ ] Mover card (drag-and-drop) já funciona corretamente — não regredir

---

### FR-006 — Reordenação de Colunas via Drag-and-Drop [P1]

**User Story:**
> Como admin, quero arrastar colunas para reorganizá-las visualmente para refletir o fluxo de trabalho da equipe.

**Acceptance Criteria:**
- [ ] Colunas podem ser arrastadas horizontalmente (dnd-kit já está configurado para cards — estender para colunas)
- [ ] Ao soltar, chama `PATCH /api/boards/:boardId/columns/reorder` com a nova ordem
- [ ] Emite `socket.emit('column:reorder', { boardId, columns })` após REST
- [ ] Todos os clientes reordenam as colunas sem reload
- [ ] A reordenação é persistida no banco (campo `position` em Column)

---

### FR-007 — Painel de Atividade em Tempo Real [P1]

**User Story:**
> Como membro do board, quero ver o feed de atividades atualizar automaticamente quando outros membros fazem ações.

**Acceptance Criteria:**
- [ ] O servidor emite `activity:new` para a room `board_${boardId}` após cada ação relevante
- [ ] O `ActivityPanel` escuta `activity:new` e prepende a nova atividade à lista
- [ ] Ações relevantes: criar card, mover card, arquivar, comentar, atribuir membro, marcar item de checklist

---

### FR-008 — Indicador "Editando agora" [P2]

**User Story:**
> Como colaborador, quero saber se outro membro está editando um card para evitar conflitos.

**Acceptance Criteria:**
- [ ] Ao abrir um card para edição, emite `card:editing:start` via WS
- [ ] Outros clientes exibem badge "João está editando" no card
- [ ] Ao fechar/salvar, emite `card:editing:stop`
- [ ] Badge some automaticamente após 5s sem atualização (debounce no servidor)

---

### FR-009 — CORS Socket.IO Restritivo [P2]

**User Story:**
> Como DevOps, quero que o servidor só aceite conexões WebSocket do domínio configurado.

**Acceptance Criteria:**
- [ ] `socket.js` usa `process.env.FRONTEND_URL` em vez de `origin: '*'`
- [ ] Em `NODE_ENV=development`, aceita `localhost:5173` como fallback
- [ ] Variável `FRONTEND_URL` documentada no `.env.example`

---

## 6. Arquitetura Técnica

### 6.1 Padrão Atual (Relay)

```
Client A ──REST──▶ Server ──DB Write──▶ OK
Client A ──WS emit──▶ Server ──broadcast──▶ Client B, C
```

**Problema:** Se Client A esquecer de emitir o WS após o REST, Client B e C ficam desatualizados.

### 6.2 Padrão Proposto (Server-Initiated Broadcast)

Para operações de coluna e card, o servidor deve emitir o broadcast diretamente após a escrita no banco, sem depender do cliente:

```
Client A ──REST──▶ Controller ──Service──▶ DB Write ──▶ OK
                       │
                       └──▶ io.to(`board_${boardId}`).emit('column:create', column)
                                  │
                               Client B, C recebem automaticamente
```

**Implementação:** Injetar `io` (instância do Socket.IO) nos controllers de coluna e card. O `io` já está disponível em `server.js` e pode ser exportado/passado via closure.

**Alternativa mais simples (sem refatorar controllers):** Manter o relay, mas garantir que o frontend **sempre** emita o evento WS após cada chamada REST bem-sucedida. Documentar esse contrato claramente.

> **Decisão recomendada:** Manter relay no curto prazo (menos refatoração). Migrar para server-initiated em uma fase futura quando os testes de integração WS estiverem em lugar.

### 6.3 Novos eventos WS necessários

| Evento (client → server) | Broadcast (server → outros) | Payload |
|---|---|---|
| `column:delete` | `column:deleted` | `{ columnId }` |
| `card:create` | `card:created` | `{ card }` (objeto completo) |
| `card:delete` | `card:deleted` | `{ cardId, columnId }` |
| `card:update` | `card:updated` | `{ card }` |
| `card:editing:start` | `card:editing:started` | `{ cardId, user: { id, name } }` |
| `card:editing:stop` | `card:editing:stopped` | `{ cardId, userId }` |
| `activity:new` | `activity:new` | `{ activity }` |

### 6.4 Mudanças no boardStore (Zustand)

```javascript
// Ações a adicionar/verificar em boardStore.js
addColumn: (column) => set(s => ({ columns: [...s.columns, column] })),
updateColumn: (col) => set(s => ({
  columns: s.columns.map(c => c.id === col.id ? { ...c, ...col } : c)
})),
removeColumn: (columnId) => set(s => ({
  columns: s.columns.filter(c => c.id !== columnId),
  cards: s.cards.filter(c => c.columnId !== columnId),
})),
addCard: (card) => set(s => ({ cards: [...s.cards, card] })),
removeCard: (cardId) => set(s => ({ cards: s.cards.filter(c => c.id !== cardId) })),
updateCard: (card) => set(s => ({
  cards: s.cards.map(c => c.id === card.id ? { ...c, ...card } : c)
})),
```

### 6.5 Componente AddColumn (novo)

```
web/src/components/AddColumnButton/
├── AddColumnButton.jsx    # Input inline com confirm/cancel
└── AddColumnButton.css
```

**Props:**
```javascript
AddColumnButton({ boardId, socket, onColumnCreated })
```

**Fluxo interno:**
1. Estado `editing: boolean`
2. Input controlado com `name`
3. `handleSubmit`: `POST /api/boards/:boardId/columns` → `socket.emit('column:create', { boardId, column })` → `onColumnCreated(column)`
4. Tratamento de erro inline (nome vazio, 403 sem permissão)

---

## 7. User Stories Detalhadas

### US-001: Criar coluna

```
Como admin do board,
Quero clicar em "+ Adicionar coluna",
Para estruturar o fluxo de trabalho da minha equipe.

Acceptance Criteria:
- [ ] Botão visível à direita da última coluna
- [ ] Input inline aparece ao clicar (sem modal/dialog)
- [ ] Enter ou botão "Criar" salva
- [ ] Escape cancela
- [ ] Coluna aparece instantaneamente para todos os conectados
- [ ] Erro de permissão exibido se role for viewer
- [ ] Erro de validação se nome vazio ou > 50 chars
```

### US-002: Sincronização em tempo real

```
Como editor conectado ao board em outro dispositivo,
Quero ver as mudanças de outros membros aparecendo automaticamente,
Para colaborar sem precisar recarregar a página.

Acceptance Criteria:
- [ ] Nova coluna aparece em < 300ms após criação por outro usuário
- [ ] Card criado aparece na coluna correta em < 300ms
- [ ] Card deletado some em < 300ms
- [ ] Reconexão (refresh/queda de rede) restaura estado correto via board:sync
- [ ] Ações feitas offline são enviadas ao reconectar (fila existente)
```

### US-003: Gerenciar colunas

```
Como admin,
Quero renomear e deletar colunas com confirmação,
Para manter o board atualizado conforme o projeto evolui.

Acceptance Criteria:
- [ ] Menu "..." por coluna com opções: Renomear, Deletar
- [ ] Renomear: edição in-place, salvo no blur/Enter
- [ ] Deletar: modal de confirmação com contagem de cards
- [ ] Todas as ações refletem em tempo real para outros usuários
```

---

## 8. Métricas de Sucesso

| Métrica | Baseline atual | Meta |
|---|---|---|
| Tempo para criar coluna (UI → visível) | N/A (não existe) | < 500ms |
| Latência WS (ação → recepção por outros) | Inconsistente | < 300ms p95 |
| Taxa de desincronização entre clientes | Alta (sem emit) | 0% para operações de coluna/card |
| Cobertura de testes backend | 84 testes | ≥ 90 testes (+ WS + coluna) |
| Cobertura de testes frontend | 19 testes | ≥ 25 testes (+ AddColumn) |

---

## 9. Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Race condition: dois admins criam coluna simultaneamente | Baixa | Médio | Position é calculado server-side; duplicatas terão a mesma posição mas IDs diferentes — reordernar resolve |
| Cliente emite WS com payload errado e dessincroniza board | Média | Alto | Adicionar validação no handler server-side; fallback: `board:sync` na reconexão sempre corrige |
| Deleção de coluna com cards não-arquivados | Média | Alto | Cascade no banco deleta tudo; UI deve mostrar contagem de cards no confirm dialog |
| Socket.IO CORS aberto em produção | Alta | Alto | Implementar FR-009 antes do deploy em produção |
| Reordenação de colunas conflita com posição dos cards | Baixa | Baixo | Posições são independentes por entidade (Column.position ≠ Card.position) |

---

## 10. Dependências e Premissas

**Dependências:**
- `@dnd-kit/core` já instalado — reutilizar para drag de colunas (FR-006)
- `lucide-react` já instalado — ícones para menu de coluna
- Socket.IO 4.8.3 já configurado com rooms e auth middleware
- Endpoint REST de coluna já existe e funciona — apenas UI e WS faltam

**Premissas:**
- O usuário autenticado já está na room `board_${boardId}` via `board:join`
- `boardStore.columns` mantém a ordem por `position` (já é o caso no `board:sync`)
- A injeção de `io` nos controllers é evitada no curto prazo — relay é suficiente

---

## 11. Fases de Implementação

### Fase 1 — Correções P0 (1–2 dias)

1. **`board.handler.js`**: adicionar handlers `column:delete` → broadcast `column:deleted`; validar `card:create` → broadcast `card:created`; `card:delete` → broadcast `card:deleted`; `card:update` → broadcast `card:updated`
2. **`boardStore.js`**: adicionar/verificar actions `addColumn`, `updateColumn`, `removeColumn`, `removeCard`, `updateCard`
3. **`AddColumnButton.jsx`**: componente novo com input inline + chamada REST + emit WS
4. **`Column.jsx`**: adicionar menu "..." com Renomear (inline) e Deletar (com confirm)
5. **`Board.jsx`**: adicionar `AddColumnButton` à direita das colunas; registrar listeners `column:created`, `column:updated`, `column:deleted`, `card:created`, `card:deleted`, `card:updated`

### Fase 2 — Melhorias P1 (2–3 dias)

6. **Drag-and-drop de colunas**: estender `DndContext` do Board para suportar drag de colunas (tipo `column`)
7. **Painel de atividade em tempo real**: emitir `activity:new` no servidor; listener no `ActivityPanel`
8. **Testes**: novos testes para `AddColumnButton`, handlers WS de coluna

### Fase 3 — Polimento P2 (1 dia)

9. **CORS Socket.IO**: `FRONTEND_URL` no `socket.js`
10. **Indicador "Editando agora"**: eventos `card:editing:start/stop`
11. **Testes de integração WS**: Jest + Socket.IO client para testar broadcast

---

## 12. Perguntas em Aberto

| # | Pergunta | Impacto | Responsável |
|---|---|---|---|
| Q1 | Editors podem criar colunas ou só admins? Atualmente o service exige `admin`. | FR-001 | Product owner |
| Q2 | Deletar coluna com cards deve deletar em cascade ou bloquear? | FR-003 | Product owner |
| Q3 | Reordenação de colunas deve ser salva em tempo real (onDragEnd) ou ter botão "Salvar ordem"? | FR-006 | UX |
| Q4 | O padrão relay (client emite WS) vs. server-initiated será mantido a longo prazo? | Arquitetura | Tech lead |
| Q5 | Limite de colunas por board? (Backend não impõe limite hoje) | Scalability | Product owner |

---

## Apêndice A — Diagnóstico WebSocket Detalhado

### Por que clientes veem coisas diferentes?

**Fluxo atual com bug:**

```
Client A faz POST /api/boards/X/columns ──▶ Coluna criada no banco
Client A NÃO emite socket.emit('column:create', ...) ──▶ nenhum broadcast
Client B continua sem ver a nova coluna
```

**Fluxo correto esperado:**

```
Client A faz POST /api/boards/X/columns ──▶ Coluna criada no banco ──▶ column { id, name, ... }
Client A emite socket.emit('column:create', { boardId, column })
Server board.handler.js recebe ──▶ socket.to(`board_X`).emit('column:create', column)
Client B recebe 'column:create' ──▶ boardStore.addColumn(column) ──▶ re-render
```

**Reconstrução de estado sempre possível via:**
```
socket.emit('board:join', { boardId })
// Server responde com board:sync contendo estado completo atualizado
```

### Eventos WS já existentes mas sem listener no frontend

| Evento servidor → cliente | Listener em Board.jsx? |
|---|---|
| `column:create` | ❌ Não registrado |
| `column:update` | ❌ Não registrado |
| `column:reorder` | ❌ Não registrado |
| `card:create` | ❌ Verificar se existe |
| `card:delete` | ❌ Verificar se existe |
| `card:update` | ❌ Verificar se existe |
| `card:move` | ✅ Implementado |
| `card:archived` | ✅ Implementado |
| `card:unarchived` | ✅ Implementado |
| `card:label:added` | ✅ Implementado |
| `board:sync` | ✅ Implementado |

> **Conclusão:** O lado servidor do relay está correto. O que falta é: (a) o frontend emitir os eventos após chamadas REST, e (b) o frontend registrar listeners para recebê-los.

---

## Apêndice B — Checklist de Implementação

### Backend (board.handler.js)

- [ ] Adicionar handler `column:delete` → broadcast `column:deleted`
- [ ] Verificar e adicionar handler `card:create` → broadcast `card:created`
- [ ] Verificar e adicionar handler `card:delete` → broadcast `card:deleted`
- [ ] Verificar e adicionar handler `card:update` → broadcast `card:updated`
- [ ] Emitir `activity:new` após ações relevantes (P1)

### Frontend (boardStore.js)

- [ ] `addColumn(column)` — adiciona ao array `columns`
- [ ] `updateColumn(col)` — atualiza por id
- [ ] `removeColumn(columnId)` — remove coluna e seus cards
- [ ] `addCard(card)` — adiciona ao array `cards`
- [ ] `removeCard(cardId)` — remove por id
- [ ] `updateCard(card)` — atualiza por id

### Frontend (Board.jsx)

- [ ] Registrar listener `column:create` → `addColumn`
- [ ] Registrar listener `column:update` → `updateColumn`
- [ ] Registrar listener `column:deleted` → `removeColumn`
- [ ] Registrar listener `card:created` → `addCard`
- [ ] Registrar listener `card:deleted` → `removeCard`
- [ ] Registrar listener `card:updated` → `updateCard`
- [ ] Desregistrar todos os listeners no cleanup do `useEffect`
- [ ] Renderizar `<AddColumnButton>` ao final das colunas (só para admin)

### Componente AddColumnButton (novo)

- [ ] Input inline controlado
- [ ] Submit: REST → emit WS → callback
- [ ] Escape cancela
- [ ] Validação de nome vazio / > 50 chars
- [ ] Loading state durante request
- [ ] Erro inline em caso de 403 ou 422

### Componente Column (atualizar)

- [ ] Menu "..." no header
- [ ] Renomear: edit inline → REST `PUT` → emit `column:update`
- [ ] Deletar: confirm dialog → REST `DELETE` → emit `column:delete`

### Testes

- [ ] `AddColumnButton.test.jsx` — render, submit, cancel, erro
- [ ] `board.handler.test.js` — novos eventos de coluna/card
- [ ] Verificar que testes existentes (84 backend + 19 frontend) continuam passando
