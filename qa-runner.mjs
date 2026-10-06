/**
 * qa-runner.js — Testes de integração realtime com 2 usuários simultâneos
 * 
 * Cobre:
 *  1. Login simultâneo (User1=Ana, User2=Bob)
 *  2. Criação de colunas (User1)
 *  3. Entrada no board via WebSocket (ambos)
 *  4. Criação de card (User1) — verificar se Bob recebe via REST (sem WS no Node puro)
 *  5. Mover card (User2) 
 *  6. Comentar (User1)
 *  7. Presença: join/leave
 *  8. Edge cases: token inválido, acesso negado
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
const require = createRequire(import.meta.url);
const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

// Contadores
let passed = 0, failed = 0;
const results = [];

function assert(condition, label, detail = '') {
  if (condition) {
    passed++;
    results.push({ status: '✅', label, detail });
    console.log(`  ✅ ${label}${detail ? ' → ' + detail : ''}`);
  } else {
    failed++;
    results.push({ status: '❌', label, detail });
    console.error(`  ❌ ${label}${detail ? ' → ' + detail : ''}`);
  }
}

async function req(method, path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  return { status: res.status, data: json };
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Socket timeout')), 6000);
  });
}

function waitForEvent(socket, event, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout aguardando '${event}'`)), timeout);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function emitWithAck(socket, event, payload, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout em '${event}'`)), timeout);
    socket.emit(event, payload, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 QA RUNNER — KANBAN REALTIME — 2 USUÁRIOS SIMULTÂNEOS');
  console.log('='.repeat(60) + '\n');

  // ── BLOCO 1: LOGIN SIMULTÂNEO ─────────────────────────────
  console.log('📋 BLOCO 1 — Autenticação Simultânea\n');

  const [r1, r2] = await Promise.all([
    req('POST', '/auth/login', { email: 'ana@qa.com', password: 'senha123' }),
    req('POST', '/auth/login', { email: 'bob@qa.com', password: 'senha123' }),
  ]);

  assert(r1.status === 200 && r1.data.token, 'User1 (Ana) login simultâneo', `status=${r1.status}`);
  assert(r2.status === 200 && r2.data.token, 'User2 (Bob) login simultâneo', `status=${r2.status}`);
  assert(r1.data.token !== r2.data.token, 'Tokens distintos por usuário');
  assert(!r1.data.user?.passwordHash, 'passwordHash não presente em User1');
  assert(!r2.data.user?.passwordHash, 'passwordHash não presente em User2');

  const t1 = r1.data.token;
  const t2 = r2.data.token;
  const user1 = r1.data.user;
  const user2 = r2.data.user;

  if (!t1 || !t2) {
    console.error('\n❌ FALHA CRÍTICA: Login falhou. Encerrando testes.\n');
    process.exit(1);
  }

  // ── BLOCO 2: BOARD E COLUNAS ──────────────────────────────
  console.log('\n📋 BLOCO 2 — Board e Colunas\n');

  // Buscar board existente
  const boardsRes = await req('GET', '/boards', null, t1);
  assert(boardsRes.status === 200, 'GET /boards retorna 200', `total=${boardsRes.data.data?.length}`);
  
  const qaBoard = boardsRes.data.data?.find(b => b.name === 'QA Board Realtime');
  assert(!!qaBoard, 'QA Board Realtime encontrado');
  
  if (!qaBoard) {
    console.error('Board não encontrado — execute qa-seed.js primeiro');
    process.exit(1);
  }

  const BOARD_ID = qaBoard.id;
  console.log(`  ℹ️  BOARD_ID: ${BOARD_ID}`);

  // Criar colunas (Ana é admin)
  let COL_TODO_ID, COL_DOING_ID, COL_DONE_ID;

  // Verificar se já existem colunas
  const colsRes = await req('GET', `/boards/${BOARD_ID}/columns`, null, t1);
  if (colsRes.data.data?.length >= 3) {
    COL_TODO_ID = colsRes.data.data[0].id;
    COL_DOING_ID = colsRes.data.data[1].id;
    COL_DONE_ID = colsRes.data.data[2].id;
    console.log('  ℹ️  Colunas já existem — reaproveitando');
    assert(true, 'Colunas existentes reutilizadas', `total=${colsRes.data.data.length}`);
  } else {
    // Criar 3 colunas
    for (const name of ['To Do', 'Doing', 'Done']) {
      const cr = await req('POST', `/boards/${BOARD_ID}/columns`, { name }, t1);
      assert(cr.status === 201, `Criar coluna "${name}"`, `id=${cr.data.data?.id}`);
      if (name === 'To Do') COL_TODO_ID = cr.data.data?.id;
      if (name === 'Doing') COL_DOING_ID = cr.data.data?.id;
      if (name === 'Done') COL_DONE_ID = cr.data.data?.id;
    }
  }

  // Bob NÃO é admin — não pode criar coluna
  const bobColRes = await req('POST', `/boards/${BOARD_ID}/columns`, { name: 'Bob Col' }, t2);
  assert(bobColRes.status === 403, 'Bob (editor) não pode criar coluna (403)');

  // ── BLOCO 3: WEBSOCKET — CONEXÃO E ROOMS ─────────────────
  console.log('\n📋 BLOCO 3 — WebSocket: Conexão e Rooms\n');

  let socketAna, socketBob;

  try {
    [socketAna, socketBob] = await Promise.all([
      connectSocket(t1),
      connectSocket(t2),
    ]);
    assert(socketAna.connected, 'Ana conectou ao WebSocket', `id=${socketAna.id}`);
    assert(socketBob.connected, 'Bob conectou ao WebSocket', `id=${socketBob.id}`);
    assert(socketAna.id !== socketBob.id, 'Socket IDs distintos');
  } catch (e) {
    assert(false, 'Conexão WebSocket', e.message);
    console.error('❌ WebSocket indisponível — pulando testes realtime');
    socketAna = socketBob = null;
  }

  // Token inválido é rejeitado
  try {
    await connectSocket('token.invalido.aqui');
    assert(false, 'Socket rejeita token inválido (não deveria conectar)');
  } catch (e) {
    assert(e.message.includes('TOKEN_INVALID') || e.message.includes('invalid'), 
      'Socket rejeita token inválido', e.message);
  }

  // Entrar no board
  let anaJoined = false, bobJoined = false;
  if (socketAna && socketBob) {
    const [ackAna, ackBob] = await Promise.all([
      emitWithAck(socketAna, 'board:join', { boardId: BOARD_ID }),
      emitWithAck(socketBob, 'board:join', { boardId: BOARD_ID }),
    ]);
    anaJoined = ackAna?.success === true;
    bobJoined = ackBob?.success === true;
    assert(anaJoined, 'Ana entrou na room board (board:join)', `room=${ackAna?.room}`);
    assert(bobJoined, 'Bob entrou na room board (board:join)', `room=${ackBob?.room}`);
  }

  // ── BLOCO 4: PRESENÇA ────────────────────────────────────
  console.log('\n📋 BLOCO 4 — Presença (Online Users)\n');

  if (socketAna && socketBob && anaJoined && bobJoined) {
    // Ana anuncia presença — Bob deve receber presence:update
    const presencePromise = waitForEvent(socketBob, 'presence:update', 4000);
    socketAna.emit('presence:join', { boardId: BOARD_ID, name: 'Ana QA' });
    
    try {
      const users = await presencePromise;
      assert(Array.isArray(users), 'Bob recebeu presence:update de Ana', `users=${JSON.stringify(users.map(u => u.name))}`);
      assert(users.some(u => u.userId === user1.id), 'Ana está na lista de presença');
    } catch (e) {
      assert(false, 'presence:update chegou a Bob', `Timeout: ${e.message}`);
    }

    // Bob também anuncia presença
    await sleep(200);
    const presencePromise2 = waitForEvent(socketAna, 'presence:update', 4000);
    socketBob.emit('presence:join', { boardId: BOARD_ID, name: 'Bob QA' });

    try {
      const users = await presencePromise2;
      assert(users.some(u => u.userId === user2.id), 'Bob aparece na lista de presença de Ana');
    } catch (e) {
      assert(false, 'Ana recebeu presence:update de Bob', `Timeout: ${e.message}`);
    }
  }

  // ── BLOCO 5: CARD:CREATE E BROADCAST ─────────────────────
  console.log('\n📋 BLOCO 5 — Cards: Criação e Broadcast\n');

  let cardId;
  if (COL_TODO_ID) {
    const cardRes = await req('POST', `/columns/${COL_TODO_ID}/cards`, {
      title: 'QA Test Card',
      description: 'Criado pelo QA Runner',
    }, t1);
    
    assert(cardRes.status === 201, 'Ana cria card via REST', `id=${cardRes.data.data?.id}`);
    cardId = cardRes.data.data?.id;
    
    // Bob não pode criar card como viewer? (ele é editor — pode)
    const bobCard = await req('POST', `/columns/${COL_TODO_ID}/cards`, {
      title: 'Card do Bob',
    }, t2);
    assert(bobCard.status === 201, 'Bob (editor) pode criar card', `id=${bobCard.data.data?.id}`);
    
    // Listar cards — ambos devem ver
    const [anaCards, bobCards] = await Promise.all([
      req('GET', `/columns/${COL_TODO_ID}/cards`, null, t1),
      req('GET', `/columns/${COL_TODO_ID}/cards`, null, t2),
    ]);
    assert(anaCards.data.data?.length >= 2, 'Ana vê os cards da coluna', `total=${anaCards.data.data?.length}`);
    assert(bobCards.data.data?.length >= 2, 'Bob vê os cards da coluna', `total=${bobCards.data.data?.length}`);
    assert(
      JSON.stringify(anaCards.data.data?.map(c => c.id)) === JSON.stringify(bobCards.data.data?.map(c => c.id)),
      'Ana e Bob veem os mesmos cards (consistência)'
    );
  }

  // ── BLOCO 6: CARD:MOVE VIA WEBSOCKET ─────────────────────
  console.log('\n📋 BLOCO 6 — Mover Card via WebSocket\n');

  if (socketAna && socketBob && cardId && COL_DOING_ID && anaJoined && bobJoined) {
    // Descobrir em qual coluna o card está agora (pode ter sido movido em execução anterior)
    const cardInfo = await req('GET', `/cards/${cardId}`, null, t1);
    const currentColumnId = cardInfo.data.data?.column?.id;
    
    // Escolher destino diferente da coluna atual
    let targetColId = COL_DOING_ID;
    if (currentColumnId === COL_DOING_ID) targetColId = COL_TODO_ID;
    
    console.log(`  ℹ️  Card está na col=${currentColumnId} → movendo para col=${targetColId}`);

    // Bob recebe o broadcast quando Ana move o card
    const cardMovePromise = waitForEvent(socketBob, 'card:move', 5000);
    
    const moveAck = await emitWithAck(socketAna, 'card:move', {
      boardId: BOARD_ID,
      cardId,
      toColumnId: targetColId,
      newPosition: 0,
    }, 5000);

    assert(moveAck?.success === true, 'Ana move card — callback de sucesso', `card="${moveAck?.data?.card?.title}"`);
    assert(moveAck?.data?.toColumnId === targetColId, 'Card movido para coluna correta', `to=${moveAck?.data?.toColumnId}`);

    try {
      const movePayload = await cardMovePromise;
      assert(!!movePayload, 'Bob recebeu card:move em tempo real');
      assert(movePayload.toColumnId === targetColId, 'Bob vê coluna destino correta', `toColumnId=${movePayload.toColumnId}`);
    } catch (e) {
      assert(false, 'Bob recebeu card:move broadcast', `Timeout: ${e.message}`);
    }

    // Ana NÃO deve receber seu próprio card:move (BUG-01 corrigido)
    let anaReceivedOwn = false;
    socketAna.once('card:move', () => { anaReceivedOwn = true; });
    await sleep(500);
    assert(!anaReceivedOwn, 'Ana NÃO recebe seu próprio card:move (BUG-01 corrigido)');
  }


  // ── BLOCO 7: COMENTÁRIOS ─────────────────────────────────
  console.log('\n📋 BLOCO 7 — Comentários\n');

  if (cardId) {
    const [c1, c2] = await Promise.all([
      req('POST', `/cards/${cardId}/comments`, { content: 'Comentário da Ana!' }, t1),
      req('POST', `/cards/${cardId}/comments`, { content: 'Comentário do Bob!' }, t2),
    ]);

    assert(c1.status === 201, 'Ana comenta no card', `id=${c1.data.data?.id}`);
    assert(c2.status === 201, 'Bob comenta no card', `id=${c2.data.data?.id}`);

    // Listar comentários
    const commentsRes = await req('GET', `/cards/${cardId}/comments`, null, t1);
    assert(commentsRes.data.data?.length >= 2, 'Ambos comentários visíveis', `total=${commentsRes.data.data?.length}`);
  }

  // ── BLOCO 8: NOTIFICAÇÕES ────────────────────────────────
  console.log('\n📋 BLOCO 8 — Notificações\n');

  const notifRes1 = await req('GET', '/notifications', null, t1);
  const notifRes2 = await req('GET', '/notifications', null, t2);
  assert(notifRes1.status === 200, 'Ana GET /notifications ok');
  assert(notifRes2.status === 200, 'Bob GET /notifications ok');

  // ── BLOCO 9: CURSOR:MOVE (REALTIME) ──────────────────────
  console.log('\n📋 BLOCO 9 — Cursores Colaborativos\n');

  if (socketAna && socketBob && anaJoined && bobJoined) {
    const cursorPromise = waitForEvent(socketBob, 'cursor:move', 3000);
    socketAna.volatile.emit('cursor:move', { boardId: BOARD_ID, x: 100, y: 200, name: 'Ana QA' });

    try {
      const cursorData = await cursorPromise;
      assert(cursorData.userId === user1.id, 'Bob recebe cursor:move de Ana em realtime');
      assert(cursorData.x === 100 && cursorData.y === 200, 'Coordenadas corretas', `x=${cursorData.x} y=${cursorData.y}`);
      assert(!cursorData.iat && !cursorData.exp, 'iat/exp NÃO vazam no cursor payload');
    } catch(e) {
      assert(false, 'Bob recebeu cursor:move', `Timeout: ${e.message}`);
    }

    // Ana NÃO deve receber seu próprio cursor
    let anaGotOwnCursor = false;
    socketAna.once('cursor:move', () => { anaGotOwnCursor = true; });
    await sleep(300);
    assert(!anaGotOwnCursor, 'Ana NÃO recebe seu próprio cursor (socket.to correto)');
  }

  // ── BLOCO 10: EDGE CASES ─────────────────────────────────
  console.log('\n📋 BLOCO 10 — Edge Cases\n');

  // Acesso sem token
  const noToken = await req('GET', '/boards');
  assert(noToken.status === 401, 'GET /boards sem token → 401', `code=${noToken.data.error?.code}`);

  // Board inexistente
  const badBoard = await req('GET', '/boards/00000000-0000-0000-0000-000000000000', null, t1);
  assert(badBoard.status === 403 || badBoard.status === 404, 'Board inexistente → 403/404');

  // Bob não pode deletar board (não é admin via delete? não, board.controller usa req.user.id corretamente)
  const deleteBoard = await req('DELETE', `/boards/${BOARD_ID}`, null, t2);
  assert(deleteBoard.status === 403, 'Bob não pode deletar o board de Ana (403)');

  // ── BLOCO 11: PRESENÇA — SAÍDA ───────────────────────────
  console.log('\n📋 BLOCO 11 — Presença: Saída\n');

  if (socketAna && socketBob && anaJoined && bobJoined) {
    const leavePromise = waitForEvent(socketBob, 'presence:update', 4000);
    
    socketAna.emit('presence:leave', { boardId: BOARD_ID });
    await sleep(300);
    socketAna.disconnect();

    try {
      const usersAfter = await leavePromise;
      assert(!usersAfter.some(u => u.userId === user1.id), 'Ana removida da lista após desconexão');
      assert(Array.isArray(usersAfter), 'presence:update emitido após disconnect de Ana');
    } catch (e) {
      assert(false, 'presence:update enviado após logout de Ana', `Timeout: ${e.message}`);
    }
  }

  // Encerra conexões
  socketBob?.disconnect();

  // ── RESULTADO FINAL ───────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTADO FINAL: ${passed} passou | ${failed} falhou | ${passed + failed} total`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🟢 SISTEMA APROVADO — Todos os testes passaram!\n');
  } else {
    console.log('\n🔴 SISTEMA COM FALHAS:\n');
    results.filter(r => r.status === '❌').forEach(r => {
      console.log(`   ❌ ${r.label}${r.detail ? ' → ' + r.detail : ''}`);
    });
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n💥 ERRO FATAL NO QA RUNNER:', err);
  process.exit(1);
});
