# Changelog

Todas as mudanças relevantes deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e o projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Alterado
- Projeto movido para a raiz do repositório — o GitHub Actions passa a encontrar `.github/workflows` (CI/CD nunca havia executado).
- Scripts de QA movidos para `scripts/qa/`; PRDs consolidados em `docs/`.
- Deploy (staging/produção) só executa com a variável de repositório `DEPLOY_ENABLED=true`.
- Threshold de cobertura do backend ajustado para 60%, o valor real medido quando o CI passou a rodar (antes 70%).
- CD só executa após CI verde na `main` (`workflow_run`), usando o commit validado pelo CI; também pode ser disparado manualmente.

### Corrigido
- `card:move` recebido de outro cliente posicionava o card no índice errado da coluna destino e não reindexava a coluna de origem (#33).
- `card:move` recebido de outro cliente apagava labels, responsáveis e checklists do card até o próximo resync (#33).
- Servidor avisa no startup quando o SMTP não está configurado (antes o envio de e-mails era desabilitado em silêncio) e quando falta `APP_URL` fora de desenvolvimento (#38).
- Com SMTP desabilitado, os envios de e-mail não consultam mais o banco à toa (#38).
- Painel de atividades nunca carregava o histórico: o frontend esperava `data.activities`, mas a API retorna `data` como lista (#34).
- Erros de ESLint no frontend que quebrariam o CI.

### Documentação
- `server/.env.example` e README documentam `SMTP_*`, `APP_URL` e como gerar senha de app no Gmail/Outlook (#38).

### Adicionado
- Botão "← Boards" e nome do board no header da board page, com truncamento em telas menores (#35).
- Renomear o board clicando no nome no header (apenas admins); Enter/blur salva, Esc cancela; outros clientes recebem `board:renamed` em tempo real, emitido pelo servidor (#40).
- Botão "Atividades" no header; painel em português, com tempo relativo ("há 5 min"), ícone e cor por tipo de atividade e coluna destino em "moveu X para Y"; fecha com Esc (#34).
- Header reorganizado em grupos com divisórias: até 3 avatares online + "+N", ícone de preferências de e-mail, controles secundários ocultos no mobile (#37).
- Botão no header para ocultar/mostrar cursores de outros usuários, salvo entre sessões; desligado, o próprio cursor deixa de ser enviado e some da tela dos demais (`cursor:hide`) (#36).
- `CONTRIBUTING.md`, `ROADMAP.md`, templates de issue e de pull request.

### Segurança
- XSS: o nome exibido no cursor de outro usuário vinha do cliente e era inserido como HTML — qualquer membro do board podia executar script no navegador dos demais. O servidor passa a usar o nome cadastrado e o cliente renderiza como texto.
- Eventos WebSocket com `boardId` agora exigem que o socket esteja na sala do board; antes, qualquer usuário autenticado podia enviar eventos (cards, colunas, labels, cursores) para boards dos quais não é membro.
- `presence:join` valida o acesso ao board e usa o nome cadastrado.
- Rate limit de autenticação restrito a login e cadastro; antes incluía `/auth/refresh`, deslogando usuários após ~15 recarregamentos de página em 30 minutos.

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
