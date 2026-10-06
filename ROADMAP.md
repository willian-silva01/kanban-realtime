# Roadmap

O backlog vive nas [issues do GitHub](https://github.com/willian-silva01/kanban-realtime/issues),
agrupado em milestones. Este arquivo resume a ordem de execução e o porquê dela.
O que já foi entregue está no [CHANGELOG](CHANGELOG.md).

## v1.2.0 — Estabilização

Corrige o que está quebrado antes de adicionar funcionalidades.

| Issue | Prioridade | Descrição |
|---|---|---|
| [#33](https://github.com/willian-silva01/kanban-realtime/issues/33) | P0 | `card:move` — outros clientes veem o card na posição errada |
| [#38](https://github.com/willian-silva01/kanban-realtime/issues/38) | P1 | SMTP não configurado falha em silêncio; `.env.example` incompleto |

## v1.3.0 — Header e navegação

Todas as issues mexem no header da board page (`App.jsx`); entregues juntas
para não refazer o layout várias vezes. Ordem interna:

| Ordem | Issue | Prioridade | Descrição |
|---|---|---|---|
| 1 | [#35](https://github.com/willian-silva01/kanban-realtime/issues/35) | P1 | Botão "← Boards" e nome do board no header |
| 2 | [#40](https://github.com/willian-silva01/kanban-realtime/issues/40) | P1 | Renomear o board inline no header (+ evento `board:rename`) |
| 3 | [#37](https://github.com/willian-silva01/kanban-realtime/issues/37) | P1 | Reorganizar e alinhar os controles do header |
| 4 | [#34](https://github.com/willian-silva01/kanban-realtime/issues/34) | P1 | Botão Atividades no header; painel em PT, tempo relativo, ícones |
| 5 | [#36](https://github.com/willian-silva01/kanban-realtime/issues/36) | P2 | Toggle para ocultar/mostrar cursores de outros usuários |

## v1.4.0 — Produtividade nos cards

| Issue | Prioridade | Descrição |
|---|---|---|
| [#39](https://github.com/willian-silva01/kanban-realtime/issues/39) | P2 | Contador de cards, quick-add, duplicar card, WIP limit, card cover |

#39 agrupa cinco funcionalidades independentes. Antes de começar, dividir em
issues menores; contador e duplicar primeiro (menor esforço, maior uso).

## Dívida técnica conhecida

- Warning de `react-hooks/exhaustive-deps` em `CommentsPanel.jsx` (`filteredMembers` sem `useMemo`).
- `server/prisma/migrations/` está no `.gitignore` e o schema é aplicado com `prisma db push` — adotar migrations versionadas antes do primeiro deploy real.
- Deploy desativado (`DEPLOY_ENABLED`) até existirem os servidores de staging e produção.
