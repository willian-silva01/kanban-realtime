# Guia de Contribuição

## Fluxo de trabalho

1. **Toda mudança começa numa issue.** Use os templates (bug ou feature) e aplique as labels de tipo, prioridade e épico.
2. **Crie uma branch a partir de `main`:**

   | Tipo | Padrão | Exemplo |
   |---|---|---|
   | Feature | `feat/<issue>-<resumo>` | `feat/40-renomear-board` |
   | Correção | `fix/<issue>-<resumo>` | `fix/33-card-move-posicao` |
   | Outros | `chore/`, `docs/`, `test/`, `refactor/` | `chore/atualizar-deps` |

3. **Commits** seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em português:

   ```
   <tipo>(<escopo>): <descrição no imperativo>
   ```

   Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`.
   Escopo é o módulo afetado (`cards`, `columns`, `auth`, `websocket`, ...).
   Exemplo: `fix(cards): calcular posição do card por coluna no card:move`

4. **Abra um Pull Request para `main`** usando o template. Escreva `closes #N` na descrição para fechar a issue no merge.
5. **Merge com squash**, depois que o CI passar. O título do PR vira o commit, então ele também segue Conventional Commits.

`main` deve estar sempre verde e pronta para deploy. Nada de commit direto nela.

## Definition of Done

Um PR está pronto para merge quando:

- [ ] Cumpre todos os critérios de aceite da issue
- [ ] Lint sem erros (`npm run lint` em `server/` e `web/`)
- [ ] Testes passando (`npm test` em `server/`, `npm run test:run` em `web/`)
- [ ] Bugs vêm com teste de regressão
- [ ] Mudança de estado do board é sincronizada via WebSocket com os outros clientes
- [ ] Novas variáveis de ambiente estão documentadas em `server/.env.example`
- [ ] `CHANGELOG.md` atualizado na seção **[Não lançado]**

## Labels

Toda issue recebe **uma label de tipo e uma de prioridade**; ao entrar numa Sprint, recebe também a de Story Points. A label de épico é opcional.

| Grupo | Labels | Uso |
|---|---|---|
| Tipo | `tipo: bug`, `tipo: feature`, `tipo: refactor`, `tipo: infra`, `tipo: testes`, `tipo: docs` | Natureza do trabalho |
| Prioridade | `P0`, `P1`, `P2` | P0 = bloqueante, entra antes de tudo · P1 = próximo ciclo · P2 = desejável |
| Story Points | `SP: 1` … `SP: 5` | Esforço estimado no Sprint Planning · 1 = simples e conhecido · 5 = complexo ou incerto |
| Épico | `epico: mvp`, `epico: sync`, `epico: colaboracao`, `epico: ux`, `epico: infra`, `epico: estabilizacao`, `epico: governanca` | Área do produto (E1 a E7) |

As labels e milestones são criadas por `bash scripts/github/setup-project.sh` (idempotente).

## Gestão com Scrum

O projeto é gerido no próprio Kanban Realtime, no workspace **Gestão do Projeto**, em um board criado com o template **Scrum** (Backlog → To Do → In Progress → Review → Done) mais a coluna **Retrospectivas**.

- **Card = issue.** Título `#<issue> título`; a descrição traz o link da issue; o checklist reúne os critérios de aceite e o Definition of Done. As labels do card são as mesmas da issue.
- **Sprint de uma semana.** Vencimento do card = último dia da Sprint; o responsável é atribuído ao mover para In Progress.
- **Sprint Planning:** cards priorizados saem do Backlog para To Do com a label de SP; a meta da Sprint fica num card fixado no topo da coluna.
- **Daily:** um comentário no card em andamento, no início de cada sessão — o que foi feito, o próximo passo, impedimentos. O painel de Atividades guarda o histórico.
- **Review:** demonstração com dois usuários no mesmo board; o board é exportado em PDF como relatório da Sprint.
- **Retrospectiva:** um card em Retrospectivas com uma prática a manter e uma a melhorar. Depois, os cards de Done são arquivados.

O card vai para Review quando o PR é aberto e para Done quando o PR é integrado (o `closes #N` fecha a issue no GitHub).

Para recriar o board com o histórico do projeto (Sprints, commits, retrospectivas e backlog futuro, definidos em `server/prisma/gestao/backlog.js`):

```bash
cd server
npm run db:seed:gestao -- --owner <seu-email> [--member <email>] [--reset]
```

## Milestones e releases

- Cada milestone corresponde a uma versão (`v1.2.0`, `v1.3.0`, ...). A ordem e o porquê dela estão no [ROADMAP](ROADMAP.md).
- Ao fechar um milestone:
  1. Mover a seção **[Não lançado]** do `CHANGELOG.md` para a nova versão
  2. Criar a tag anotada: `git tag -a v1.2.0 -m "v1.2.0"`
  3. Publicar a release no GitHub com as notas do changelog
- Versionamento semântico: `MAJOR` para quebra de API/eventos WebSocket, `MINOR` para funcionalidade, `PATCH` para correção.

## Ambiente local

Veja [Como Executar](README.md#como-executar) no README. Scripts de QA manual com dois usuários simultâneos estão em [`scripts/qa/`](scripts/qa/README.md).
