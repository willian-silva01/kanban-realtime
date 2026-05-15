# Product Requirements Document — Kanban Realtime

**Produto:** Kanban Realtime — Quadro Kanban Colaborativo em Tempo Real  
**Status:** Em Revisão  
**Autor:** Time de Produto  
**Data:** 2026-05-14  
**Versão:** 1.0  

---

## Sumário Executivo

**One-liner:** Uma plataforma de gestão visual de tarefas em tempo real onde equipes colaboram simultaneamente no mesmo quadro Kanban sem latência.

**Visão geral:** O Kanban Realtime é um sistema de gerenciamento de tarefas colaborativo inspirado no Trello, mas com foco em sincronização em tempo real via WebSocket, rastreamento de presença dos membros e histórico de atividades. O projeto já possui uma base técnica sólida — backend Node.js/Express com Socket.IO, PostgreSQL via Prisma, autenticação JWT com controle de acesso baseado em papéis (RBAC) e frontend React com drag-and-drop.

O produto se diferencia pela experiência colaborativa ao vivo: múltiplos usuários podem mover cartões, criar colunas e ver os cursores uns dos outros em tempo real. Esse diferencial precisa ser ampliado e comunicado de forma mais explícita na interface.

Este PRD cobre: (1) análise do estado atual, (2) melhorias nas funcionalidades existentes, (3) adaptações necessárias na arquitetura e UX, e (4) novas funcionalidades sugeridas para as próximas versões.

**Quick Facts:**
- **Usuários-alvo:** Equipes de desenvolvimento, design, marketing e freelancers
- **Problema resolvido:** Gestão descentralizada de tarefas com desatualização de status entre membros
- **Métrica-chave:** Sessões colaborativas ativas (mais de um usuário por sessão no mesmo board)
- **Lançamento-alvo:** MVP — Q3 2026 / v2.0 — Q1 2027

---

## Índice

1. [Estado Atual do Projeto](#1-estado-atual-do-projeto)
2. [Declaração do Problema](#2-declaração-do-problema)
3. [Objetivos e Metas](#3-objetivos-e-metas)
4. [Personas de Usuário](#4-personas-de-usuário)
5. [User Stories e Requisitos](#5-user-stories-e-requisitos)
6. [Métricas de Sucesso](#6-métricas-de-sucesso)
7. [Escopo](#7-escopo)
8. [Considerações Técnicas](#8-considerações-técnicas)
9. [Design e UX](#9-design-e-ux)
10. [Timeline e Milestones](#10-timeline-e-milestones)
11. [Riscos e Mitigações](#11-riscos-e-mitigações)
12. [Dependências e Premissas](#12-dependências-e-premissas)
13. [Questões em Aberto](#13-questões-em-aberto)

---

## 1. Estado Atual do Projeto

### O que foi construído

| Camada | Status | Observações |
|--------|--------|-------------|
| Modelagem do banco (Prisma/PostgreSQL) | ✅ Completo | Schema robusto com 8 entidades |
| API REST (boards, columns, cards, comments, activities) | ✅ Completo | Validação Zod, RBAC, rate limit |
| Autenticação JWT (access + refresh) | ✅ Completo | Bcrypt, helmet, tokens separados |
| WebSocket Gateway (Socket.IO) | ✅ Completo | Autenticação no handshake |
| Sincronização realtime (cards, colunas, atividade) | ✅ Completo | Broadcast por sala de board |
| Presença de usuários online | ✅ Completo | In-memory, pronto para Redis |
| Rastreamento de cursores em tempo real | ✅ Completo | Throttle 50ms |
| Frontend — Login / Registro | ✅ Completo | React, Axios, AuthContext |
| Frontend — Board com DnD | ✅ Completo | @dnd-kit |
| Frontend — Notificações | ✅ Completo | NotificationBell em tempo real |
| Frontend — Painel de Atividades | ✅ Completo | ActivityPanel |
| Frontend — Comentários | ✅ Completo | CommentsPanel |
| Gerenciamento de estado (Zustand) | ❌ Pendente | Atualmente React Context |
| Testes (unitários / integração) | ❌ Pendente | Sem cobertura |
| CI/CD Pipeline | ❌ Pendente | Sem pipeline |
| Redis (presença distribuída) | ❌ Pendente | In-memory placeholder |
| Mobile responsivo | ❌ Pendente | Desktop-first atual |

### Pontos fortes identificados

- Arquitetura modular com separação clara (controller → service → repository)
- Segurança em camadas: Helmet, CORS configurável, rate limiting, JWT no WebSocket
- Padrão de updates otimistas com broadcast excluindo o emissor
- Abstração de presença pronta para migração para Redis

### Débitos técnicos identificados

1. **Gerenciamento de estado no frontend** usa React Context puro — sem Zustand conforme planejado
2. **Sem testes automatizados** em nenhuma camada
3. **Token refresh** não implementado no frontend (interceptor detecta 401 mas só faz logout)
4. **Sem tratamento de reconexão** WebSocket com resync de estado
5. **Ausência de skeleton screens** e estados de carregamento na UI
6. **Sem virtualização** de listas — boards com muitos cartões podem degradar performance
7. **Sem validação de tamanho de payload** nos eventos WebSocket

---

## 2. Declaração do Problema

### O Problema

Equipes distribuídas e remotas perdem eficiência quando o status de tarefas é comunicado por mensagens, e-mails ou reuniões em vez de ser visível em tempo real num sistema compartilhado. Ferramentas como Trello resolvem a organização visual, mas carecem de colaboração ao vivo — não exibem quem está olhando, editando ou movendo o quê neste momento.

### Estado Atual

Usuários atualmente dependem de:
- Ferramentas como Trello/Jira com refresh manual para ver atualizações
- Reuniões de sincronização recorrentes para alinhar status
- Notificações por e-mail com atraso de minutos a horas

### Impacto

**Para o usuário:**
- 30–45 minutos diários gastos em comunicação de status que poderia ser passiva
- Conflitos de edição em ferramentas sem sincronização (dois membros movem o mesmo cartão)
- Falta de contexto sobre "quem está trabalhando no quê agora"

**Para o negócio:**
- Diferenciação fraca frente ao Trello sem funcionalidades avançadas de colaboração ao vivo
- Risco de abandono se a experiência de primeira vez não comunicar o valor realtime

### Por que agora?

O backbone técnico está pronto. A janela para lançar o MVP e validar o diferencial de "colaboração ao vivo" é agora, antes de adicionar complexidade.

---

## 3. Objetivos e Metas

### Objetivos de Negócio

1. **Lançar MVP funcional** com as funcionalidades core validadas por usuários reais até Q3 2026
2. **Demonstrar o diferencial realtime** — que seja imediatamente perceptível ao abrir um board com outro usuário
3. **Construir base para monetização** via planos Premium (boards ilimitados, membros ilimitados, analytics)

### Objetivos do Usuário

1. **Ver o que minha equipe está fazendo agora** sem precisar perguntar
2. **Organizar tarefas visualmente** com drag-and-drop fluido
3. **Receber contexto completo de um cartão** — comentários, responsável, prazo, checklist — sem trocar de ferramenta

### Não-Objetivos (fora do escopo deste PRD)

- Integração com ferramentas externas (GitHub, Slack, Jira) — fase futura
- App mobile nativo (iOS/Android) — avaliação após validação do web
- Modelo de IA para sugestão de tarefas — roadmap de longo prazo
- Editor rich-text completo nas descrições — markdown simples é suficiente por ora

---

## 4. Personas de Usuário

### Persona 1 — Lucas, Tech Lead (Primária)

| Campo | Detalhe |
|-------|---------|
| Idade | 28–38 anos |
| Cargo | Tech Lead / Engenheiro Sênior |
| Tech-savviness | Alto |
| Contexto | Coordena sprint de 5–8 devs remotamente |

**Comportamentos:**
- Mantém o board aberto em segundo plano enquanto trabalha
- Verifica o progresso das tarefas do time várias vezes ao dia
- Prefere ferramentas com atalhos de teclado e API

**Necessidades:**
- Visibilidade em tempo real do que cada membro está fazendo
- Histórico de atividades para auditar mudanças sem perguntar
- Criar e reordenar colunas rapidamente para refletir o processo

**Dores:**
- Ferramentas lentas que exigem F5 para atualizar
- Sem visibilidade de quem está online/trabalhando no board agora
- Conflitos ao mover cartões que já foram movidos por outro membro

**Citação:** _"Eu precisaria abrir o Slack para descobrir o status de algo que deveria estar visível no board."_

---

### Persona 2 — Ana, Designer (Secundária)

| Campo | Detalhe |
|-------|---------|
| Idade | 24–32 anos |
| Cargo | UX/Product Designer |
| Tech-savviness | Médio |
| Contexto | Colabora com devs e PM no mesmo board de projeto |

**Comportamentos:**
- Usa o board para acompanhar entregas de design e feedback
- Prefere interface visual limpa e intuitiva
- Usa frequentemente comentários e etiquetas

**Necessidades:**
- Interface bonita e responsiva que funcione em diferentes telas
- Suporte a labels coloridas para categorizar cartões visualmente
- Comentários com menções para acionar colegas

**Dores:**
- Boards visualmente poluídos sem hierarquia clara
- Falta de suporte mobile para ver o board em reuniões no celular

---

### Persona 3 — Fernanda, Gerente de Projetos (Terciária)

| Campo | Detalhe |
|-------|---------|
| Idade | 32–45 anos |
| Cargo | Project Manager / Scrum Master |
| Tech-savviness | Médio |
| Contexto | Gerencia múltiplos projetos simultaneamente |

**Necessidades:**
- Dashboard com visão geral de múltiplos boards
- Datas de vencimento nos cartões com alertas
- Relatórios de progresso e histórico de atividades exportáveis

---

## 5. User Stories e Requisitos

### Epic A — Melhorias na Experiência Existente

#### A1 — Refresh Automático de Token JWT (P0 — Must Have)

```
Como usuário autenticado,
Quero que minha sessão seja renovada automaticamente em background,
Para que eu não seja deslogado no meio de uma sessão de trabalho.
```

**Critérios de Aceitação:**
- [ ] O interceptor Axios detecta resposta 401 e tenta `POST /api/auth/refresh` com o refresh token
- [ ] Se o refresh for bem-sucedido, a requisição original é re-executada transparentemente
- [ ] Se o refresh falhar, o usuário é redirecionado ao login com mensagem explicativa
- [ ] O refresh token (7d) é armazenado em `httpOnly cookie` em vez de localStorage

**Prioridade:** P0 | **Esforço:** M

---

#### A2 — Reconexão WebSocket com Resync de Estado (P0 — Must Have)

```
Como usuário colaborando em um board,
Quero que minha conexão seja restaurada automaticamente após queda de rede,
Para não perder o estado atual do board ou ficar com dados desatualizados.
```

**Critérios de Aceitação:**
- [ ] Socket.IO reconecta automaticamente com backoff exponencial (já parcialmente configurado)
- [ ] Ao reconectar, o cliente emite `board:join` e recebe o estado completo atualizado do board
- [ ] Um indicador visual discreto aparece quando offline e desaparece ao reconectar
- [ ] Ações executadas offline são enfileiradas e enviadas após reconexão

**Prioridade:** P0 | **Esforço:** L

---

#### A3 — Skeleton Screens e Estados de Carregamento (P1 — Should Have)

```
Como usuário abrindo um board,
Quero ver um placeholder animado enquanto os dados carregam,
Para que a interface não pareça quebrada durante o fetch inicial.
```

**Critérios de Aceitação:**
- [ ] Skeleton screens nas colunas e cartões durante carregamento inicial
- [ ] Spinner/indicador de progresso em operações de drag-and-drop pendentes
- [ ] Estados de erro com mensagem acionável ("Tentar novamente")
- [ ] Operações otimistas com indicador de sincronização pendente

**Prioridade:** P1 | **Esforço:** M

---

#### A4 — Migração para Zustand (State Management) (P1 — Should Have)

```
Como desenvolvedor mantendo o frontend,
Quero migrar o estado global de React Context para Zustand,
Para que o gerenciamento de estado seja mais previsível, testável e performático.
```

**Critérios de Aceitação:**
- [ ] Stores Zustand para: `authStore`, `boardStore`, `notificationStore`, `presenceStore`
- [ ] Eliminação de re-renders desnecessários por Context granular
- [ ] DevTools do Zustand habilitadas em desenvolvimento
- [ ] AuthContext mantido apenas como provider de inicialização

**Prioridade:** P1 | **Esforço:** L

---

### Epic B — Funcionalidades de Cartão Enriquecidas

#### B1 — Labels / Etiquetas nos Cartões (P0 — Must Have)

```
Como membro de um board,
Quero adicionar labels coloridas a um cartão,
Para categorizar tarefas por tipo, prioridade ou área.
```

**Critérios de Aceitação:**
- [ ] Cada board possui um conjunto de labels personalizáveis (nome + cor)
- [ ] Até 5 labels aplicáveis por cartão
- [ ] Labels visíveis no cartão na visão do board (chips coloridos)
- [ ] Filtro por label no board (esconde cartões sem a label selecionada)
- [ ] Sincronização em tempo real ao adicionar/remover label
- [ ] Cores pré-definidas (10 opções) + cor personalizada via hex

**Modelo de Dados Novo:**
```sql
Label: { id, boardId, name, color, createdAt }
CardLabel: { cardId, labelId }
```

**Prioridade:** P0 | **Esforço:** M

---

#### B2 — Data de Vencimento nos Cartões (P0 — Must Have)

```
Como membro de um board,
Quero definir uma data de vencimento em um cartão,
Para que eu e minha equipe saibamos o prazo da tarefa.
```

**Critérios de Aceitação:**
- [ ] Campo de data/hora editável no detalhe do cartão
- [ ] Indicador visual no cartão (badge de data) com código de cor: verde (no prazo), amarelo (vence em 24h), vermelho (vencido)
- [ ] Notificação in-app 24h antes do vencimento para membros atribuídos
- [ ] Ordenação/filtro de cartões por data de vencimento

**Prioridade:** P0 | **Esforço:** S

---

#### B3 — Atribuição de Membros a Cartões (P0 — Must Have)

```
Como líder de equipe,
Quero atribuir um ou mais membros a um cartão,
Para que fique claro quem é responsável por cada tarefa.
```

**Critérios de Aceitação:**
- [ ] Seletor de membros no detalhe do cartão (busca por nome/email)
- [ ] Avatar(s) dos responsáveis visíveis no cartão na visão do board
- [ ] Notificação em tempo real ao ser atribuído a um cartão
- [ ] Filtro "Meus cartões" exibe apenas cartões atribuídos ao usuário logado

**Modelo de Dados Novo:**
```sql
CardAssignee: { cardId, userId, assignedAt, assignedBy }
```

**Prioridade:** P0 | **Esforço:** M

---

#### B4 — Checklists nos Cartões (P1 — Should Have)

```
Como responsável por uma tarefa,
Quero criar uma checklist dentro do cartão,
Para acompanhar subtarefas sem criar cartões separados.
```

**Critérios de Aceitação:**
- [ ] Múltiplas checklists por cartão (com nome próprio)
- [ ] Itens da checklist com checkbox e texto editável
- [ ] Progresso visível no cartão (ex: "3/5 concluídos")
- [ ] Reordenação dos itens via drag-and-drop
- [ ] Sincronização em tempo real para todos os membros do board

**Modelo de Dados Novo:**
```sql
Checklist: { id, cardId, title, position }
ChecklistItem: { id, checklistId, text, completed, position, completedBy }
```

**Prioridade:** P1 | **Esforço:** L

---

#### B5 — Descrição Markdown nos Cartões (P1 — Should Have)

```
Como membro de um board,
Quero escrever a descrição do cartão em Markdown,
Para formatar o conteúdo com cabeçalhos, listas e código.
```

**Critérios de Aceitação:**
- [ ] Editor com preview de Markdown (modo toggle: editar / visualizar)
- [ ] Suporte a: títulos, negrito, itálico, listas, blocos de código, links
- [ ] Salvo automaticamente após 1s de inatividade (debounce)
- [ ] Renderização segura (sanitização de HTML para evitar XSS)

**Prioridade:** P1 | **Esforço:** M

---

### Epic C — Busca e Filtros

#### C1 — Busca Global no Board (P1 — Should Have)

```
Como usuário de um board com muitos cartões,
Quero buscar cartões por texto, label ou responsável,
Para encontrar rapidamente o que preciso sem rolar o board.
```

**Critérios de Aceitação:**
- [ ] Barra de busca acessível via atalho `Ctrl+F` / `Cmd+F` no board
- [ ] Busca em tempo real por: título do cartão, descrição, comentários
- [ ] Filtro por: label, responsável, data de vencimento, coluna
- [ ] Resultados destacados na visão do board (cartões não-correspondentes ficam opacos)
- [ ] Limpeza de filtros com um clique

**Prioridade:** P1 | **Esforço:** L

---

### Epic D — Colaboração Avançada

#### D1 — Menções nos Comentários (P1 — Should Have)

```
Como membro de um board,
Quero mencionar colegas com @nome em comentários,
Para notificá-los diretamente sobre algo relevante.
```

**Critérios de Aceitação:**
- [ ] Ao digitar `@` num comentário, exibe dropdown de membros do board
- [ ] Mencionado recebe notificação in-app em tempo real
- [ ] Mencionado recebe e-mail de notificação (configurável)
- [ ] Nome mencionado renderizado como chip clicável no comentário

**Prioridade:** P1 | **Esforço:** M

---

#### D2 — Reações em Comentários (P2 — Nice to Have)

```
Como membro do board,
Quero reagir a comentários com emojis,
Para dar feedback rápido sem precisar escrever uma resposta.
```

**Critérios de Aceitação:**
- [ ] 6 reações pré-definidas (👍 ❤️ 🎉 😄 🤔 😕)
- [ ] Contagem de reações visível no comentário
- [ ] Usuário pode adicionar/remover sua própria reação
- [ ] Sincronizado em tempo real

**Prioridade:** P2 | **Esforço:** S

---

### Epic E — Workspaces e Multi-Board

#### E1 — Workspace (Espaço de Trabalho) (P1 — Should Have)

```
Como gerente de projetos,
Quero organizar boards em workspaces por cliente ou projeto,
Para não misturar contextos e controlar acessos por workspace.
```

**Critérios de Aceitação:**
- [ ] Usuário pode criar múltiplos workspaces
- [ ] Cada workspace tem membros próprios (independente dos boards)
- [ ] Boards pertencem a um workspace
- [ ] Dashboard com lista de workspaces e boards recentes
- [ ] Papéis por workspace: `owner`, `admin`, `member`

**Modelo de Dados Novo:**
```sql
Workspace: { id, name, slug, ownerId, createdAt }
WorkspaceMember: { workspaceId, userId, role }
Board: { ..., workspaceId }  -- adicionar FK
```

**Prioridade:** P1 | **Esforço:** XL

---

#### E2 — Templates de Board (P2 — Nice to Have)

```
Como novo usuário,
Quero iniciar um board a partir de um template pré-configurado,
Para não precisar criar colunas e estrutura do zero.
```

**Templates Iniciais:**
- Scrum Sprint (Backlog, To Do, In Progress, Review, Done)
- Kanban Simples (To Do, In Progress, Done)
- Roadmap (Q1, Q2, Q3, Q4)
- Gestão de Bugs (Reportado, Triagem, Em Correção, Resolvido)

**Prioridade:** P2 | **Esforço:** M

---

### Epic F — Notificações e Comunicação

#### F1 — Notificações por E-mail (P1 — Should Have)

```
Como membro de um board,
Quero receber e-mails para eventos importantes,
Para ser notificado mesmo quando não estou com a aplicação aberta.
```

**Eventos que disparam e-mail:**
- Atribuído a um cartão
- Mencionado em comentário
- Prazo de cartão vencendo (24h antes)
- Adicionado a um board/workspace

**Critérios de Aceitação:**
- [ ] Templates de e-mail responsivos com branding do produto
- [ ] Configurações granulares por tipo de evento (opt-out por tipo)
- [ ] Unsubscribe em um clique via link no e-mail
- [ ] Rate limiting para evitar spam (máx 1 e-mail por evento por hora)

**Prioridade:** P1 | **Esforço:** L

---

### Epic G — Performance e Infraestrutura

#### G1 — Redis para Presença e Pub/Sub (P0 — Must Have)

```
Como desenvolvedor escalando o sistema,
Quero migrar a presença de usuários para Redis,
Para suportar múltiplas instâncias do servidor sem estado compartilhado inconsistente.
```

**Critérios de Aceitação:**
- [ ] `PresenceService` usa Redis como backend (substituindo o Map in-memory)
- [ ] Socket.IO configurado com `socket.io-redis` adapter para pub/sub entre instâncias
- [ ] Presença expira automaticamente via TTL no Redis (evita usuários "fantasma")
- [ ] Docker Compose atualizado com serviço Redis

**Prioridade:** P0 | **Esforço:** M

---

#### G2 — Cobertura de Testes (P0 — Must Have)

```
Como desenvolvedor,
Quero ter testes automatizados no backend e frontend,
Para garantir que refatorações não quebrem funcionalidades existentes.
```

**Critérios de Aceitação:**
- [ ] **Backend:** Testes unitários nos services com Jest + cobertura mínima de 70%
- [ ] **Backend:** Testes de integração nas rotas principais com supertest + banco de teste isolado
- [ ] **Frontend:** Testes de componentes com React Testing Library (Board, Card, Column)
- [ ] **Frontend:** Testes de hooks customizados (useSocket, useAuth)
- [ ] Pipeline CI executa os testes a cada push

**Prioridade:** P0 | **Esforço:** XL

---

#### G3 — CI/CD Pipeline (P1 — Should Have)

```
Como desenvolvedor,
Quero um pipeline automatizado de integração e deploy,
Para que cada merge na branch main seja validado e entregue automaticamente.
```

**Etapas do Pipeline (GitHub Actions):**
1. Lint (ESLint)
2. Type check (se TypeScript for adicionado)
3. Testes unitários + integração
4. Build da aplicação
5. Deploy para ambiente de staging
6. Smoke tests no staging
7. Deploy para produção (manual approval)

**Prioridade:** P1 | **Esforço:** L

---

### Requisitos Funcionais — Tabela Consolidada

| ID | Descrição | Prioridade | Status |
|----|-----------|-----------|--------|
| FR-001 | Refresh automático de token JWT | P0 | Aberto |
| FR-002 | Reconexão WebSocket com resync | P0 | Aberto |
| FR-003 | Labels nos cartões | P0 | Aberto |
| FR-004 | Data de vencimento nos cartões | P0 | Aberto |
| FR-005 | Atribuição de membros a cartões | P0 | Aberto |
| FR-006 | Redis para presença e pub/sub | P0 | Aberto |
| FR-007 | Testes automatizados | P0 | Aberto |
| FR-008 | Skeleton screens e estados de carregamento | P1 | Aberto |
| FR-009 | Migração para Zustand | P1 | Aberto |
| FR-010 | Checklists nos cartões | P1 | Aberto |
| FR-011 | Descrição Markdown nos cartões | P1 | Aberto |
| FR-012 | Busca e filtros no board | P1 | Aberto |
| FR-013 | Menções em comentários | P1 | Aberto |
| FR-014 | Workspaces | P1 | Aberto |
| FR-015 | Notificações por e-mail | P1 | Aberto |
| FR-016 | CI/CD Pipeline | P1 | Aberto |
| FR-017 | Design responsivo (mobile) | P1 | Aberto |
| FR-018 | Reações em comentários | P2 | Aberto |
| FR-019 | Templates de board | P2 | Aberto |
| FR-020 | Exportar board (CSV/PDF) | P2 | Aberto |
| FR-021 | Atalhos de teclado | P2 | Aberto |
| FR-022 | Modo escuro | P2 | Aberto |
| FR-023 | Arquivamento de cartões/boards | P2 | Aberto |

---

### Requisitos Não-Funcionais

| ID | Categoria | Descrição | Meta |
|----|-----------|-----------|------|
| NFR-001 | Performance | Tempo de resposta da API (p95) | < 200ms |
| NFR-002 | Performance | Latência dos eventos WebSocket | < 100ms |
| NFR-003 | Performance | Carregamento inicial do board | < 2 segundos |
| NFR-004 | Performance | DnD — animação fluida | 60 FPS |
| NFR-005 | Disponibilidade | Uptime do servidor | 99.5% |
| NFR-006 | Segurança | Tokens armazenados em httpOnly cookie | Obrigatório |
| NFR-007 | Segurança | Sanitização de Markdown/HTML | XSS: zero |
| NFR-008 | Escalabilidade | Usuários simultâneos por board | 50+ sem degradação |
| NFR-009 | Acessibilidade | Navegação completa por teclado | Obrigatório |
| NFR-010 | Acessibilidade | WCAG 2.1 Level AA | Conformidade |
| NFR-011 | Observabilidade | Logs estruturados em produção | JSON format |
| NFR-012 | Observabilidade | Health check endpoint | GET /api/health |

---

## 6. Métricas de Sucesso

### Métrica Norte-Estrela

**Métrica:** Sessões Colaborativas Ativas por Semana  
**Definição:** Número de sessões em que 2+ usuários distintos interagem no mesmo board no mesmo dia  
**Baseline atual:** 0 (produto ainda não em produção)  
**Meta em 90 dias pós-lançamento:** 100 sessões/semana  
**Por quê:** Esta métrica captura o diferencial central do produto — colaboração ao vivo

---

### Framework HEART

| Dimensão | Métrica | Meta |
|----------|---------|------|
| **Happiness** | NPS pós-onboarding | ≥ 40 |
| **Engagement** | Cartões movidos por usuário/semana | ≥ 5 |
| **Adoption** | Boards criados no primeiro dia | ≥ 80% dos novos usuários |
| **Retention** | Usuários ativos na semana 4 | ≥ 40% |
| **Task Success** | Onboarding completo (criar board + cartão) | ≥ 90% |

### KPIs Secundários

| Métrica | Baseline | Meta (30d) | Meta (90d) |
|---------|----------|-----------|-----------|
| Usuários registrados | 0 | 200 | 1.000 |
| Boards ativos | 0 | 100 | 500 |
| Taxa de retenção D7 | - | 35% | 45% |
| Latência média WebSocket | - | < 80ms | < 50ms |
| Tempo de uptime | - | 99% | 99.5% |
| Bug reports críticos/semana | - | < 3 | < 1 |

### Eventos a Rastrear

```
board_created          — Usuário cria um board
board_opened           — Usuário abre um board
card_created           — Cartão criado
card_moved             — Cartão arrastado entre colunas
card_detail_opened     — Modal de detalhe do cartão aberto
comment_added          — Comentário criado
member_invited         — Membro convidado para board
label_applied          — Label aplicada a cartão
due_date_set           — Data de vencimento definida
assignee_set           — Responsável atribuído a cartão
realtime_collision     — Dois usuários editam o mesmo cartão simultaneamente
session_collaborative  — Sessão com 2+ usuários simultâneos no mesmo board
```

---

## 7. Escopo

### MVP — Fase 1 (Q2–Q3 2026)

**Incluso:**
- Correções de débito técnico críticas (FR-001, FR-002, FR-006, FR-007)
- Labels nos cartões (FR-003)
- Data de vencimento (FR-004)
- Atribuição de membros (FR-005)
- Skeleton screens (FR-008)
- Zustand migration (FR-009)
- Descrição Markdown nos cartões (FR-011)

**Excluído do MVP:**
- Workspaces (complexidade alta — fase 2)
- Notificações por e-mail (depende de infra SMTP)
- Templates de board
- Aplicativo mobile nativo

### Fase 2 (Q4 2026 — Q1 2027)

- Workspaces (FR-014)
- Notificações por e-mail (FR-015)
- Busca e filtros avançados (FR-012)
- Checklists nos cartões (FR-010)
- Menções em comentários (FR-013)
- CI/CD completo (FR-016)
- Design responsivo (FR-017)

### Fase 3 — Avançado (Q2 2027+)

- Modo escuro (FR-022)
- Exportação de boards (FR-020)
- Atalhos de teclado globais (FR-021)
- Templates de board (FR-019)
- Analytics de produtividade por board
- Integrações (GitHub, Slack)

---

## 8. Considerações Técnicas

### Arquitetura Atual (Confirmar)

```
Browser (React + Vite)
    ↓ HTTP REST
Express.js API ← Zod validation → PostgreSQL (Prisma)
    ↓ WebSocket
Socket.IO ← JWT auth → PresenceService (in-memory → Redis)
```

### Adaptações de Arquitetura Recomendadas

#### 8.1 — Migração de Tokens para httpOnly Cookies

**Estado atual:** Access token armazenado em `localStorage` (vulnerável a XSS)  
**Proposta:** Migrar para `httpOnly cookie` com flag `Secure` e `SameSite=Strict`

```javascript
// Backend: setar cookie no login
res.cookie('access_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000
});
```

**Impacto:** Requer atualização do auth middleware e remoção do header `Authorization` manual no Axios

---

#### 8.2 — Redis Adapter para Socket.IO

```bash
# Adicionar ao docker-compose.yml
redis:
  image: redis:7-alpine
  ports: ["6379:6379"]
```

```javascript
// socket.js
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

---

#### 8.3 — Implementação de Virtualização para Boards Grandes

Para boards com 100+ cartões, adicionar virtualização com `@tanstack/react-virtual` compatível com `@dnd-kit`:

```
Board → VirtualColumn → VirtualCardList → Card
```

---

#### 8.4 — Novos Endpoints Necessários

**Labels:**
- `GET /api/boards/:boardId/labels` — listar labels do board
- `POST /api/boards/:boardId/labels` — criar label
- `PATCH /api/boards/:boardId/labels/:labelId` — editar label
- `DELETE /api/boards/:boardId/labels/:labelId` — deletar label
- `POST /api/cards/:cardId/labels/:labelId` — aplicar label ao cartão
- `DELETE /api/cards/:cardId/labels/:labelId` — remover label do cartão

**Atribuições:**
- `POST /api/cards/:cardId/assignees` — atribuir membro
- `DELETE /api/cards/:cardId/assignees/:userId` — remover atribuição

**Checklists:**
- `GET /api/cards/:cardId/checklists` — listar checklists
- `POST /api/cards/:cardId/checklists` — criar checklist
- `POST /api/checklists/:checklistId/items` — adicionar item
- `PATCH /api/checklists/:checklistId/items/:itemId` — marcar/desmarcar item

**Workspace:**
- `GET /api/workspaces` — listar workspaces do usuário
- `POST /api/workspaces` — criar workspace
- `GET /api/workspaces/:workspaceId/boards` — listar boards do workspace

---

#### 8.5 — Novos Eventos WebSocket

```javascript
// Labels
'card:label:added'     → { cardId, labelId, boardId }
'card:label:removed'   → { cardId, labelId, boardId }

// Atribuições
'card:assignee:added'  → { cardId, userId, boardId }
'card:assignee:removed'→ { cardId, userId, boardId }

// Checklists
'checklist:item:toggled' → { cardId, checklistId, itemId, completed }

// Data de vencimento
'card:duedate:updated' → { cardId, dueDate, boardId }
```

---

### Stack Técnico (Atualizado)

| Camada | Tecnologia | Versão Atual | Proposta |
|--------|-----------|-------------|---------|
| Frontend Framework | React | 19.x | Manter |
| State Management | React Context | — | Zustand 5.x |
| Build | Vite | 8.x | Manter |
| Drag & Drop | @dnd-kit | 6.x | Manter |
| Backend | Node.js + Express | 4.x | Manter |
| WebSocket | Socket.IO | 4.x | Adicionar Redis adapter |
| ORM | Prisma | 6.x | Manter |
| Banco | PostgreSQL | 16 | Manter |
| Cache/PubSub | — | — | Redis 7 Alpine |
| Testes Backend | — | — | Jest + Supertest |
| Testes Frontend | — | — | Vitest + RTL |
| E-mail | — | — | Resend ou Nodemailer |
| CI/CD | — | — | GitHub Actions |
| Markdown | — | — | marked + DOMPurify |

---

## 9. Design e UX

### Princípios de UX

1. **Realtime-first:** Toda ação deve ter feedback visual imediato, mesmo antes da confirmação do servidor
2. **Colaboração visível:** A presença de outros usuários deve ser perceptível sem ser intrusiva
3. **Progressivo:** O board simples funciona; funcionalidades avançadas são descobertas progressivamente
4. **Velocidade percebida:** Skeleton screens e atualizações otimistas eliminam a sensação de espera

---

### Fluxo Principal — Primeira Experiência

```
1. Registro/Login
2. Dashboard → Lista de Workspaces/Boards
3. Criar board (ou usar template)
4. Board aberto → DnD imediato disponível
5. Criar cartão → Modal básico (título + descrição)
6. Convidar membro → Link de convite
7. Colaboração ao vivo visível (avatar do outro usuário aparece)
```

---

### Componentes de UI Novos Necessários

| Componente | Localização | Funcionalidade |
|-----------|-------------|----------------|
| `LabelPicker` | Card Modal | Selecionar/criar labels |
| `DatePicker` | Card Modal | Selecionar data de vencimento |
| `MemberPicker` | Card Modal | Buscar e atribuir membros |
| `ChecklistEditor` | Card Modal | Criar/editar checklists |
| `MarkdownEditor` | Card Modal | Editar descrição com preview |
| `FilterBar` | Board Header | Filtrar cartões por label/membro/data |
| `SearchModal` | Board | Busca global (Ctrl+F) |
| `WorkspaceSidebar` | Layout | Navegação entre workspaces |
| `OnlineIndicator` | Board Header | Avatares dos usuários online |
| `SkeletonBoard` | Board | Placeholder durante carregamento |
| `ConnectionStatus` | Global | Indicador online/offline |

---

### Requisitos de Acessibilidade

- Navegação completa por teclado no board (Tab, Enter, Setas para mover cartões)
- ARIA labels em todos os elementos interativos
- Contraste de cores mínimo 4.5:1 (WCAG AA)
- Foco visível sempre presente
- Anúncio de atualizações em tempo real via `aria-live`
- Suporte a screen readers (NVDA, VoiceOver)

---

### Design Responsivo

| Breakpoint | Comportamento |
|-----------|---------------|
| Mobile (< 768px) | Exibe uma coluna por vez com navegação horizontal por swipe |
| Tablet (768–1023px) | Exibe até 3 colunas, scroll horizontal habilitado |
| Desktop (1024px+) | Layout completo com todas as colunas visíveis |

---

## 10. Timeline e Milestones

### Roadmap Atualizado

| Fase | Entregas | Prazo |
|------|---------|-------|
| **Fase 0 — Estabilização** | FR-001 (refresh token), FR-002 (reconexão), FR-006 (Redis), FR-007 (testes base) | Jun 2026 |
| **Fase 1 — MVP** | FR-003 a FR-005 (labels, datas, assignees), FR-008 a FR-009 (UX/estado), FR-011 (Markdown) | Ago 2026 |
| **Fase 2 — Colaboração** | FR-010 (checklists), FR-012 (busca), FR-013 (menções), FR-014 (workspaces), FR-015 (e-mail) | Nov 2026 |
| **Fase 3 — Polimento** | FR-016 (CI/CD), FR-017 (mobile), FR-021 (atalhos), FR-022 (dark mode) | Fev 2027 |

### Milestones da Fase 0 (Estabilização)

- **Semana 1–2:** Implementar refresh token + httpOnly cookie
- **Semana 2–3:** Redis integration + Socket.IO adapter
- **Semana 3–6:** Setup Jest/Vitest + cobertura de testes críticos
- **Semana 6:** Deploy de ambiente staging funcional

---

## 11. Riscos e Mitigações

| Risco | Impacto | Prob. | Mitigação |
|-------|---------|-------|-----------|
| Conflito de edição simultânea (dois usuários editam mesmo cartão) | Alto | Médio | Implementar lock otimista com timestamp + UI de conflito |
| Memory leak em handlers de Socket.IO | Alto | Médio | Named handlers + cleanup explícito no `disconnect` |
| Tokens JWT em localStorage (XSS) | Alto | Alto | Migrar para httpOnly cookie (FR-001) |
| Boards com 500+ cartões degradam performance | Médio | Baixo | Virtualização com @tanstack/react-virtual |
| Presença in-memory falha com múltiplas instâncias | Alto | Alto | Redis obrigatório antes de escalar (FR-006) |
| Custo de Redis em produção | Baixo | Médio | Redis serverless (Upstash) para fase inicial |
| Dependência de Socket.IO dificulta testes | Médio | Alto | Abstrair em interface + mock nos testes |
| Scope creep nas funcionalidades de cartão | Médio | Alto | PRD como referência; novos itens entram na Fase 3+ |

---

## 12. Dependências e Premissas

### Dependências Internas

- [ ] Prisma schema atualizado para Label, CardAssignee, Checklist, ChecklistItem, Workspace
- [ ] Docker Compose atualizado com Redis
- [ ] Variáveis de ambiente documentadas para Redis, SMTP, frontend URL

### Dependências Externas

- [ ] Serviço de envio de e-mail (Resend, SendGrid ou SMTP próprio) para FR-015
- [ ] Domínio configurado para produção

### Premissas

- O projeto continuará como open-source ou projeto pessoal (sem time dedicado de QA externo)
- Deploy será em ambiente cloud simples (Railway, Render, ou VPS) — não Kubernetes por ora
- Usuários-alvo são técnicos / early adopters; onboarding pode ser minimalista no MVP
- Budget zero para serviços pagos na Fase 0 (usar tiers gratuitos de Redis, e-mail, CI)

---

## 13. Questões em Aberto

- [ ] **Modelo de negócio:** O produto será freemium? Quais funcionalidades são pagas (boards ilimitados, membros ilimitados, exportação)?
  - **Owner:** Fundador/PM
  - **Prazo:** Antes da Fase 2

- [ ] **Convite de membros:** Por link público, por e-mail, ou ambos?
  - **Context:** Afeta o modelo de dados de convites e o fluxo de onboarding
  - **Owner:** PM + Dev
  - **Prazo:** Antes do MVP

- [ ] **Conflict resolution:** Como tratar dois usuários movendo o mesmo cartão ao mesmo tempo?
  - **Options:** (a) Last-write-wins (simples), (b) Lock otimista com notificação de conflito, (c) CRDT (complexo)
  - **Owner:** Dev Lead
  - **Prazo:** Fase 1

- [ ] **Tamanho máximo de payload WebSocket:** Boards grandes podem gerar eventos pesados — definir limite e estratégia de paginação de histórico
  - **Owner:** Dev
  - **Prazo:** Fase 0

- [ ] **Estratégia de arquivamento:** Cartões/boards arquivados ficam visíveis em página separada ou desaparecem completamente?
  - **Owner:** PM
  - **Prazo:** Fase 3

---

## Apêndice

### Referências

- Modelagem do sistema: `docs/01-modelagem-sistema.md`
- Schema do banco: `server/prisma/schema.prisma`
- Documentação Socket.IO: https://socket.io/docs/v4/
- @dnd-kit documentation: https://dndkit.com/
- Prisma docs: https://www.prisma.io/docs/

### Glossário

| Termo | Definição |
|-------|-----------|
| **Board** | Quadro Kanban principal com colunas e cartões |
| **Card** | Unidade de trabalho dentro de uma coluna |
| **Column** | Agrupador de cartões representando um estado (ex: "Em progresso") |
| **Workspace** | Agrupador de boards por organização/projeto |
| **Presence** | Sistema que rastreia quais usuários estão online num board |
| **Optimistic Update** | Atualizar a UI imediatamente antes da confirmação do servidor |
| **RBAC** | Role-Based Access Control — permissões por papel (admin, editor, viewer) |
| **DnD** | Drag and Drop — arrastar e soltar cartões/colunas |

### Changelog

| Versão | Data | Autor | Alterações |
|--------|------|-------|-----------|
| 1.0 | 2026-05-14 | Time de Produto | Criação inicial com análise do projeto e PRD completo |
