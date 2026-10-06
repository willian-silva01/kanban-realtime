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

Toda issue recebe **uma label de tipo e uma de prioridade**. A label de épico é opcional.

| Grupo | Labels | Uso |
|---|---|---|
| Tipo | `tipo: bug`, `tipo: feature`, `tipo: refactor`, `tipo: infra`, `tipo: testes`, `tipo: docs` | Natureza do trabalho |
| Prioridade | `P0`, `P1`, `P2` | P0 = bloqueante, entra antes de tudo · P1 = próximo ciclo · P2 = desejável |
| Épico | `epico: estabilizacao`, `epico: sync`, `epico: ux`, `epico: colaboracao`, `epico: infra`, `epico: mvp` | Área do produto |

## Milestones e releases

- Cada milestone corresponde a uma versão (`v1.2.0`, `v1.3.0`, ...). A ordem e o porquê dela estão no [ROADMAP](ROADMAP.md).
- Ao fechar um milestone:
  1. Mover a seção **[Não lançado]** do `CHANGELOG.md` para a nova versão
  2. Criar a tag anotada: `git tag -a v1.2.0 -m "v1.2.0"`
  3. Publicar a release no GitHub com as notas do changelog
- Versionamento semântico: `MAJOR` para quebra de API/eventos WebSocket, `MINOR` para funcionalidade, `PATCH` para correção.

## Ambiente local

Veja [Como Executar](README.md#como-executar) no README. Scripts de QA manual com dois usuários simultâneos estão em [`scripts/qa/`](scripts/qa/README.md).
