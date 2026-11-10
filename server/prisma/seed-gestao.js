// =============================================
// Seed do board de gestão do projeto (Scrum no próprio Kanban Realtime)
//
// Cria o workspace "Gestão do Projeto" com um board do template Scrum e
// registra o histórico do desenvolvimento: Sprints 1 a 8, cada item com
// história de usuário, critérios de aceite, DoD, commits e labels, além das
// retrospectivas e do backlog de melhorias futuras. Usa a camada de serviços
// do backend (mesmas regras de negócio da API) e data as atividades conforme
// o calendário das Sprints.
//
// Uso (a partir de server/):
//   node prisma/seed-gestao.js --owner <email> [--member <email>]... [--reset]
// =============================================

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// Prisma sem log de queries e Socket.IO inerte: o seed roda fora do servidor
global.__prisma = global.__prisma || new PrismaClient({ log: ['warn', 'error'] });
const socket = require('../src/websocket/socket');
const noopIo = { to: () => noopIo, emit: () => {} };
socket.getIo = () => noopIo;

const prisma = require('../src/config/database');
const workspaceService = require('../src/modules/workspace/workspace.service');
const boardService = require('../src/modules/board/board.service');
const columnService = require('../src/modules/column/column.service');
const cardService = require('../src/modules/card/card.service');
const labelService = require('../src/modules/label/label.service');
const checklistService = require('../src/modules/checklist/checklist.service');
const commentService = require('../src/modules/comment/comment.service');
const assigneeService = require('../src/modules/assignee/assignee.service');
const { REPO, COMMITS, SPRINTS, ITENS, FUTURO, RETROS, DOD } = require('./gestao/backlog');

const WORKSPACE_NAME = 'Gestão do Projeto';
const BOARD_NAME = 'Kanban Realtime - Desenvolvimento';

// ─── Argumentos ─────────────────────────────────────
const args = process.argv.slice(2);
const argValues = (flag) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]] : []));
const OWNER_EMAIL = argValues('--owner')[0];
const MEMBER_EMAILS = argValues('--member');
const RESET = args.includes('--reset');

// ─── Datas (America/Sao_Paulo) ──────────────────────
const pad = (n) => String(n).padStart(2, '0');
const at = (ymd, h = 9, m = 0) => new Date(`${ymd}T${pad(h)}:${pad(m)}:00-03:00`);
const addDays = (ymd, d) => {
  const dt = new Date(`${ymd}T12:00:00-03:00`);
  dt.setDate(dt.getDate() + d);
  return dt.toISOString().slice(0, 10);
};
const br = (ymd) => ymd.split('-').reverse().join('/');

const sprintOf = (n) => SPRINTS.find((s) => s.n === n);

// ─── Labels ─────────────────────────────────────────
const EPICOS = {
  mvp: '#7C3AED', sync: '#2563EB', colaboracao: '#DB2777', ux: '#0891B2',
  infra: '#4B5563', estabilizacao: '#B45309', governanca: '#15803D',
};
const PRIORIDADES = { P0: '#DC2626', P1: '#EA580C', P2: '#CA8A04' };

async function createLabels(boardId, userId) {
  const defs = [
    ...SPRINTS.map((s) => [`Sprint ${s.n}`, '#0F766E']),
    ['Backlog futuro', '#64748B'],
    ...[1, 2, 3, 4, 5].map((sp) => [`SP: ${sp}`, '#6366F1']),
    ...Object.entries(EPICOS).map(([e, c]) => [`epico: ${e}`, c]),
    ...Object.entries(PRIORIDADES),
    ['Meta da Sprint', '#0D9488'],
    ['Retrospectiva', '#9333EA'],
  ];
  const labels = {};
  for (const [name, color] of defs) {
    const label = await labelService.create(boardId, userId, { name, color });
    labels[name] = label.id;
  }
  return labels;
}

// ─── Helpers de histórico ───────────────────────────
let BOARD_ID;

// Data a atividade recém-criada (a mais recente do board)
async function stampLastActivity(date) {
  const last = await prisma.activityLog.findFirst({
    where: { boardId: BOARD_ID },
    orderBy: { createdAt: 'desc' },
  });
  if (last) await prisma.activityLog.update({ where: { id: last.id }, data: { createdAt: date } });
}

async function createCard(columnId, userId, title, description, date) {
  const card = await cardService.create(columnId, userId, { title, description });
  await stampLastActivity(date);
  await prisma.card.update({ where: { id: card.id }, data: { createdAt: date, updatedAt: date } });
  return card;
}

async function moveCard(cardId, userId, toColumnId, date, toTop = false) {
  const newPosition = toTop ? 0 : await prisma.card.count({ where: { columnId: toColumnId, archivedAt: null } });
  await cardService.move(cardId, userId, { toColumnId, newPosition });
  await stampLastActivity(date);
  await prisma.card.update({ where: { id: cardId }, data: { updatedAt: date } });
}

async function comment(cardId, userId, content, date) {
  const created = await commentService.create(cardId, userId, content);
  await stampLastActivity(date);
  await prisma.comment.update({ where: { id: created.id }, data: { createdAt: date } });
}

async function addLabels(cardId, userId, labels, names) {
  for (const name of names) await labelService.addToCard(cardId, labels[name], userId);
}

async function addChecklist(cardId, userId, title, items, completedCount) {
  const { checklist } = await checklistService.create(cardId, userId, { title });
  for (const [i, text] of items.entries()) {
    const { item } = await checklistService.addItem(checklist.id, userId, { text });
    if (i < completedCount) await checklistService.updateItem(checklist.id, item.id, userId, { completed: true });
  }
}

// ─── Conteúdo dos cards ─────────────────────────────
function issueCell(item) {
  if (item.id.startsWith('#')) return `[${item.id}](${REPO}/issues/${item.id.slice(1)})`;
  if (item.id.startsWith('MVP')) return 'Anterior ao uso de issues (entregue no MVP)';
  return 'Sem issue própria (item técnico)';
}

function itemDescription(item) {
  const s = sprintOf(item.sprint);
  const rows = [
    ['Sprint', `Sprint ${s.n} · ${s.nome} (${br(s.inicio)} a ${br(s.fim)})`],
    ['Release', s.release],
    ['Issue', issueCell(item)],
    ...(item.branch ? [['Branch', `\`${item.branch}\``]] : []),
    ['Estimativa', `${item.sp} Story Point${item.sp > 1 ? 's' : ''}`],
    ['Categoria', item.cat],
    ['Prioridade', item.prio],
  ];
  const parts = [
    '**História de usuário**', item.historia, '',
    '**Critérios de aceite**', ...item.criterios.map((c) => `- ${c}`), '',
    '**Rastreabilidade**', '', '| Campo | Valor |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ];
  if (item.commits?.length) {
    parts.push('', '**Commits**', ...item.commits.map((h) => `- [\`${h}\`](${REPO}/commit/${h}) ${COMMITS[h]}`));
  }
  return parts.join('\n');
}

function futureDescription(f) {
  return [
    '**História de usuário**', f.historia, '',
    '**Critérios de aceite**', ...f.criterios.map((c) => `- ${c}`), '',
    '**Contexto**', f.origem, '',
    `Estimativa inicial: ${f.sp} Story Points. Categoria: ${f.cat}. Prioridade: ${f.prio}.`,
  ].join('\n');
}

const cardTitle = (item) => (item.id === 's/n' ? item.titulo : `${item.id} ${item.titulo}`);

// ─── Execução ───────────────────────────────────────
async function main() {
  if (!OWNER_EMAIL) {
    console.error('Uso: node prisma/seed-gestao.js --owner <email> [--member <email>]... [--reset]');
    process.exit(1);
  }
  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) throw new Error(`Usuário ${OWNER_EMAIL} não encontrado. Cadastre-o na aplicação primeiro.`);
  const U = owner.id;

  // Workspace (reaproveita se existir) e board (recria só com --reset)
  const workspaces = await workspaceService.listByUser(U);
  let workspace = workspaces.find((w) => w.name === WORKSPACE_NAME);
  if (workspace) {
    const existing = await prisma.board.findMany({ where: { workspaceId: workspace.id, name: BOARD_NAME } });
    if (existing.length && !RESET) {
      console.log(`O board "${BOARD_NAME}" já existe. Use --reset para recriá-lo.`);
      return;
    }
    for (const b of existing) await boardService.delete(b.id, U);
  } else {
    workspace = await workspaceService.create(U, { name: WORKSPACE_NAME });
  }

  const board = await boardService.create(U, { name: BOARD_NAME, workspaceId: workspace.id, template: 'scrum' });
  BOARD_ID = board.id;
  await columnService.create(board.id, U, { name: 'Retrospectivas' });
  const cols = Object.fromEntries(
    (await prisma.column.findMany({ where: { boardId: board.id } })).map((c) => [c.name, c.id])
  );
  const labels = await createLabels(board.id, U);
  await prisma.activityLog.deleteMany({ where: { boardId: board.id } }); // logs de montagem do board

  // Itens das Sprints, em ordem cronológica
  for (const s of SPRINTS) {
    const itens = ITENS.filter((i) => i.sprint === s.n && i.id !== '#48');

    // Meta da Sprint 8 (Sprint corrente), primeiro card de To Do
    if (s.n === 8) {
      const itens8 = ITENS.filter((i) => i.sprint === 8);
      const meta = await createCard(cols['To Do'], U, 'Meta da Sprint 8', [
        `**${s.nome}** (${br(s.inicio)} a ${br(s.fim)})`, '',
        '**Meta**', s.meta, '',
        '**Capacidade planejada**', `${itens8.length} itens e ${itens8.reduce((t, i) => t + i.sp, 0)} Story Points.`, '',
        '**Itens comprometidos**', ...itens8.map((i) => `- ${i.id} ${i.titulo} (${i.sp} SP)`),
      ].join('\n'), at(s.inicio, 9, 0));
      await addLabels(meta.id, U, labels, ['Meta da Sprint', 'Sprint 8']);
    }
    for (const [idx, item] of itens.entries()) {
      const criado = at(addDays(s.inicio, s.n === 1 ? -2 : -3), 10, idx * 5);
      const card = await createCard(cols.Backlog, U, cardTitle(item), itemDescription(item), criado);
      await addLabels(card.id, U, labels, [`Sprint ${s.n}`, `SP: ${item.sp}`, `epico: ${item.epico}`, item.prio]);
      const concluidos = { done: DOD.length, review: DOD.length - 1, todo: 0 }[item.status];
      await addChecklist(card.id, U, 'Critérios de aceite', item.criterios, item.status === 'todo' ? 0 : item.criterios.length);
      await addChecklist(card.id, U, 'Definition of Done', DOD, concluidos);

      // Sprint Planning
      await moveCard(card.id, U, cols['To Do'], at(s.inicio, 9, 30 + idx));
      if (item.status === 'todo') {
        await comment(card.id, U, `Planejado no Sprint Planning de ${br(s.inicio)} com estimativa de ${item.sp} Story Point${item.sp > 1 ? 's' : ''}.`, at(s.inicio, 10, idx));
        continue;
      }
      await assigneeService.addToCard(card.id, U, U);

      // Desenvolvimento e revisão
      const dia = addDays(s.inicio, 1 + Math.floor((idx * 5) / itens.length));
      await moveCard(card.id, U, cols['In Progress'], at(dia, 10, idx));
      await moveCard(card.id, U, cols.Review, at(dia, 17, idx));
      if (item.status === 'review') {
        await comment(card.id, U, `PR integrado na branch preview/validacao. Aguardando a aprovação na Sprint Review para seguir para a main e gerar a release ${s.release}.`, at(dia, 17, 30 + idx));
        continue;
      }

      // Sprint Review
      await moveCard(card.id, U, cols.Done, at(s.fim, 16, idx), true);
      const commits = item.commits.map((h) => `\`${h}\``).join(', ');
      await comment(card.id, U, `Entregue e demonstrado na Sprint Review de ${br(s.fim)}, com dois usuários conectados ao mesmo board. Critérios de aceite verificados. Commit${item.commits.length > 1 ? 's' : ''}: ${commits}.`, at(s.fim, 16, 30 + idx));
    }

    // Retrospectiva da Sprint
    const retro = RETROS.find((r) => r.sprint === s.n);
    if (retro) {
      const feitos = ITENS.filter((i) => i.sprint === s.n);
      const pontos = feitos.reduce((t, i) => t + i.sp, 0);
      const desc = [
        `**Sprint ${s.n} · ${s.nome}** (${br(s.inicio)} a ${br(s.fim)})`, '',
        '**Meta da Sprint**', s.meta, '',
        '**Resultado**', `Meta atingida. ${feitos.length} itens e ${pontos} Story Points entregues.`, '',
        '**O que manter**', retro.manter, '',
        '**O que melhorar**', retro.melhorar, '',
        '**Ação para a próxima Sprint**', retro.acao,
      ].join('\n');
      const card = await createCard(cols.Retrospectivas, U, `Retrospectiva da Sprint ${s.n}`, desc, at(s.fim, 17, 30));
      await addLabels(card.id, U, labels, ['Retrospectiva', `Sprint ${s.n}`]);
      await assigneeService.addToCard(card.id, U, U);
    }
  }

  // Backlog de melhorias futuras
  const s8 = sprintOf(8);
  for (const [idx, f] of FUTURO.entries()) {
    const card = await createCard(cols.Backlog, U, f.titulo, futureDescription(f), at(addDays(s8.inicio, 1), 14, idx * 3));
    await addLabels(card.id, U, labels, ['Backlog futuro', `SP: ${f.sp}`, `epico: ${f.epico}`, f.prio]);
    await addChecklist(card.id, U, 'Critérios de aceite', f.criterios, 0);
    await comment(card.id, U, `Registrado no refinamento do Backlog. ${f.origem}`, at(addDays(s8.inicio, 1), 14, idx * 3 + 1));
  }

  // #48: o próprio board (concluído agora)
  const i48 = ITENS.find((i) => i.id === '#48');
  const c48 = await cardService.create(cols['To Do'], U, { title: cardTitle(i48), description: itemDescription(i48) });
  await addLabels(c48.id, U, labels, ['Sprint 8', `SP: ${i48.sp}`, `epico: ${i48.epico}`, i48.prio]);
  await addChecklist(c48.id, U, 'Critérios de aceite', i48.criterios, i48.criterios.length);
  await addChecklist(c48.id, U, 'Definition of Done', DOD, DOD.length);
  await assigneeService.addToCard(c48.id, U, U);
  for (const col of ['In Progress', 'Review']) {
    await cardService.move(c48.id, U, { toColumnId: cols[col], newPosition: await prisma.card.count({ where: { columnId: cols[col], archivedAt: null } }) });
  }
  await cardService.move(c48.id, U, { toColumnId: cols.Done, newPosition: 0 });
  await commentService.create(c48.id, U, 'Board configurado com o histórico completo do projeto (Sprints 1 a 8), as retrospectivas e o backlog de melhorias futuras.');

  // Membros entram no fim, para não receberem notificações do histórico
  for (const email of MEMBER_EMAILS) {
    await workspaceService.addMember(workspace.id, U, { email, role: 'admin' });
    await boardService.addMember(board.id, U, { email, role: 'admin' });
  }

  // Resumo
  const total = await prisma.card.count({ where: { column: { boardId: board.id } } });
  const porColuna = await prisma.column.findMany({
    where: { boardId: board.id }, orderBy: { position: 'asc' },
    select: { name: true, _count: { select: { cards: true } } },
  });
  console.log(`Board "${BOARD_NAME}" criado no workspace "${WORKSPACE_NAME}" (${total} cards).`);
  for (const c of porColuna) console.log(`  ${c.name.padEnd(15)} ${c._count.cards}`);
  if (MEMBER_EMAILS.length) console.log(`Membros: ${MEMBER_EMAILS.join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
