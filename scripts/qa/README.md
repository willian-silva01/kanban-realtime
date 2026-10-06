# Scripts de QA

Testes manuais de integração em tempo real contra um servidor local rodando em `http://localhost:3000`.
Execute todos a partir da **raiz do repositório**, porque `qa-data.json` é lido e gravado no diretório atual.

| Script | O que faz |
|---|---|
| `qa-seed.js` | Cria usuários e board de teste e grava `qa-data.json`. Rode primeiro. |
| `qa-runner.mjs` | Simula 2 usuários simultâneos: login, colunas, cards, move, comentários, presença e casos de borda |
| `qa-test-move.cjs` | Emite um `card:move` isolado: `node scripts/qa/qa-test-move.cjs <token> <boardId> <cardId> <toColumnId>` |
| `stress-runner.mjs` | Abre 25 sockets na mesma sala do board. Exige as variáveis `QA_TOKEN` e `QA_BOARD_ID` |

```bash
node scripts/qa/qa-seed.js
node scripts/qa/qa-runner.mjs
QA_TOKEN=<jwt> QA_BOARD_ID=<uuid> node scripts/qa/stress-runner.mjs
```

Os scripts usam `socket.io-client`. Se ele não estiver instalado, rode `npm install socket.io-client --no-save` na raiz.
