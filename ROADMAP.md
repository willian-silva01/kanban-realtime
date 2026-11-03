# Roadmap

O backlog vive nas [issues do GitHub](https://github.com/willian-silva01/kanban-realtime/issues),
agrupado em milestones. Este arquivo resume a ordem de execução e o porquê dela.
O que já foi entregue está no [CHANGELOG](CHANGELOG.md).

Cada milestone é executado em Sprints de uma semana, acompanhadas no board Scrum
do próprio Kanban Realtime (ver [Gestão com Scrum](CONTRIBUTING.md#gestão-com-scrum)).

| Sprint | Milestone | Situação |
|---|---|---|
| 1 | v0.1.0 — Fundação do MVP | Publicada |
| 2–4 | v1.0.0 — Primeira versão completa | Publicada |
| 5 | v1.1.0 — Colunas pela UI e sync consistente | Publicada |
| 6 | v1.2.0 — Estabilização | Concluída, em validação (`preview/validacao`) |
| 7 | v1.3.0 — Header e navegação | Concluída, em validação (`preview/validacao`) |
| 8 | v1.4.0 — Produtividade nos cards | Em andamento |

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

A #39 agrupava cinco funcionalidades independentes e foi dividida no refinamento
(#41–#45). Contador e duplicar primeiro (menor esforço, maior uso). A Sprint
também quita duas dívidas técnicas e configura o board de gestão do projeto.

| Issue | Prioridade | SP | Descrição |
|---|---|---|---|
| [#41](https://github.com/willian-silva01/kanban-realtime/issues/41) | P2 | 1 | Contador de cards por coluna |
| [#42](https://github.com/willian-silva01/kanban-realtime/issues/42) | P2 | 2 | Duplicar card |
| [#43](https://github.com/willian-silva01/kanban-realtime/issues/43) | P2 | 2 | Quick-add de cards |
| [#44](https://github.com/willian-silva01/kanban-realtime/issues/44) | P2 | 3 | Limite WIP por coluna |
| [#45](https://github.com/willian-silva01/kanban-realtime/issues/45) | P2 | 2 | Capa do card |
| [#46](https://github.com/willian-silva01/kanban-realtime/issues/46) | P1 | 3 | Cobertura do backend de volta a 70% |
| [#47](https://github.com/willian-silva01/kanban-realtime/issues/47) | P1 | 2 | Adotar migrations versionadas do Prisma |
| [#48](https://github.com/willian-silva01/kanban-realtime/issues/48) | P1 | 1 | Configurar o board Scrum do projeto no Kanban Realtime |

## Dívida técnica conhecida

- Threshold de cobertura do backend reduzido de 70% para 60% (baseline real quando o CI passou a rodar). Só pode subir — volta a 70% na #46.
- Warning de `react-hooks/exhaustive-deps` em `CommentsPanel.jsx` (`filteredMembers` sem `useMemo`).
- `server/prisma/migrations/` está no `.gitignore` e o schema é aplicado com `prisma db push` — migrations versionadas na #47, antes do primeiro deploy real.
- Deploy desativado (`DEPLOY_ENABLED`) até existirem os servidores de staging e produção.
