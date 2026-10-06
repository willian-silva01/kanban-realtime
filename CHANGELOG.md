# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Alterado
- Projeto movido para a raiz do repositório — o GitHub Actions passa a encontrar `.github/workflows` (CI/CD nunca havia executado).
- Scripts de QA movidos para `scripts/qa/`; PRDs consolidados em `docs/`.
- Deploy (staging/produção) só executa com a variável de repositório `DEPLOY_ENABLED=true`.

### Corrigido
- Painel de atividades nunca carregava o histórico: o frontend esperava `data.activities`, mas a API retorna `data` como lista (#34).
- Erros de ESLint no frontend que quebrariam o CI.

### Adicionado
- Botão "← Boards" e nome do board no header da board page, com truncamento em telas menores (#35).
- Renomear o board clicando no nome no header (apenas admins); Enter/blur salva, Esc cancela; outros clientes recebem `board:renamed` em tempo real, emitido pelo servidor (#40).
- Botão "Atividades" no header; painel em português, com tempo relativo ("há 5 min"), ícone e cor por tipo de atividade e coluna destino em "moveu X para Y"; fecha com Esc (#34).
- Header reorganizado em grupos com divisórias: até 3 avatares online + "+N", ícone de preferências de e-mail, controles secundários ocultos no mobile (#37).
- `CONTRIBUTING.md`, `ROADMAP.md`, templates de issue e de pull request.

## [1.1.0] — 2026-05-19

PRD v2 — colunas pela UI e sincronização WebSocket consistente.

### Adicionado
- Criar, renomear e deletar colunas pela UI com sincronização em tempo real (#24, #25, #26).
- Painel de atividade em tempo real via WebSocket (#30).
- Indicador "Editando agora" em cards (#31).

### Corrigido
- Sincronização WebSocket de reordenação de colunas (#27).
- Sincronização WebSocket de cards — create/delete/update (#28).

### Segurança
- CORS do Socket.IO restrito à origem definida em `FRONTEND_URL` (#32).

### Testes
- Cobertura para reordenação de colunas via drag-and-drop (#29).

## [1.0.0] — 2026-05-18

Primeira versão completa (PRD v1).

### Adicionado
- Reconexão WebSocket com resync de estado e fila offline (#2).
- Redis para presença e pub/sub WebSocket, com fallback em memória (#3).
- Labels coloridas nos cartões (#5).
- Data de vencimento com lembretes (#6).
- Atribuição de membros a cartões (#7).
- Skeleton screens e estados de carregamento (#8).
- Estado global com Zustand (#9).
- Descrição em Markdown (#10).
- Checklists nos cartões (#11).
- Busca e filtros globais no board (#12).
- Menções de membros em comentários (#13).
- Workspaces e dashboard de boards (#14).
- Notificações por e-mail com templates, rate limit e unsubscribe (#15).
- Pipeline CI/CD com GitHub Actions e Docker (#16).
- Design responsivo para mobile e tablet (#17).
- Reações com emojis em comentários (#18).
- Templates de board pré-configurados (#19).
- Exportação do board para CSV e PDF (#20).
- Atalhos de teclado globais (#21).
- Modo escuro (#22).
- Arquivamento de cartões e boards (#23).

### Testes
- Suíte automatizada: Jest + Supertest no backend, Vitest + RTL no frontend (#4).

## [0.1.0] — 2026-05-15

### Adicionado
- Fundação do MVP: boards, colunas, cartões, comentários, presença e cursores em tempo real.
- Autenticação JWT com refresh token em cookie httpOnly.

[Não lançado]: https://github.com/willian-silva01/kanban-realtime/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/willian-silva01/kanban-realtime/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/willian-silva01/kanban-realtime/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/willian-silva01/kanban-realtime/releases/tag/v0.1.0
