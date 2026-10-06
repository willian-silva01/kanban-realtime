/**
 * qa-seed.js — Prepara dados de teste para o QA de 2 usuários simultâneos
 * 
 * Execução: node qa-seed.js
 * 
 * O que faz:
 *  1. Registra user1 (ana@qa.com) e user2 (bob@qa.com)
 *  2. User1 cria um board "QA Board"
 *  3. User1 adiciona User2 como membro 'editor'
 *  4. User1 cria 3 colunas: To Do / Doing / Done
 *  5. Imprime tokens e IDs para uso nos testes manuais
 */

const BASE_URL = 'http://localhost:3000/api';

async function post(path, body, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(json.error)}`);
  }
  return json;
}

async function main() {
  console.log('\n🌱 QA Seed — Kanban Realtime\n' + '='.repeat(50));

  // ─── Registrar usuários ───────────────────────────────────
  let user1Token, user1, user2Token, user2;

  try {
    const r1 = await post('/auth/register', {
      name: 'Ana QA', email: 'ana@qa.com', password: 'senha123',
    });
    user1Token = r1.token;
    user1 = r1.user;
    console.log(`✅ User1 criado: ${user1.name} (${user1.id})`);
  } catch (e) {
    // Já existe — tenta login
    if (e.message.includes('EMAIL_ALREADY_EXISTS')) {
      const r = await post('/auth/login', { email: 'ana@qa.com', password: 'senha123' });
      user1Token = r.token;
      user1 = r.user;
      console.log(`ℹ️  User1 já existe, login feito: ${user1.name}`);
    } else throw e;
  }

  try {
    const r2 = await post('/auth/register', {
      name: 'Bob QA', email: 'bob@qa.com', password: 'senha123',
    });
    user2Token = r2.token;
    user2 = r2.user;
    console.log(`✅ User2 criado: ${user2.name} (${user2.id})`);
  } catch (e) {
    if (e.message.includes('EMAIL_ALREADY_EXISTS')) {
      const r = await post('/auth/login', { email: 'bob@qa.com', password: 'senha123' });
      user2Token = r.token;
      user2 = r.user;
      console.log(`ℹ️  User2 já existe, login feito: ${user2.name}`);
    } else throw e;
  }

  // ─── Criar Board ─────────────────────────────────────────
  let boardId;
  try {
    const boardRes = await post('/boards', { name: 'QA Board Realtime' }, user1Token);
    boardId = boardRes.data.id;
    console.log(`✅ Board criado: "${boardRes.data.name}" (${boardId})`);
  } catch (e) {
    throw new Error(`Falha ao criar board: ${e.message}`);
  }

  // ─── Adicionar User2 como membro ─────────────────────────
  try {
    await post(`/boards/${boardId}/members`, { email: 'bob@qa.com', role: 'editor' }, user1Token);
    console.log(`✅ Bob adicionado ao board como 'editor'`);
  } catch (e) {
    if (e.message.includes('ALREADY_MEMBER')) {
      console.log(`ℹ️  Bob já é membro do board`);
    } else throw e;
  }

  // ─── Criar Colunas ───────────────────────────────────────
  const columnNames = ['To Do', 'Doing', 'Done'];
  const columnIds = [];

  for (let i = 0; i < columnNames.length; i++) {
    try {
      const colRes = await post(
        `/boards/${boardId}/columns`,
        { name: columnNames[i], position: i },
        user1Token
      );
      const colId = colRes.data?.id;
      columnIds.push(colId);
      console.log(`✅ Coluna "${columnNames[i]}" criada (${colId})`);
    } catch (e) {
      console.warn(`⚠️  Coluna "${columnNames[i]}" falhou: ${e.message}`);
    }
  }

  // ─── Resultado ───────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  console.log('📋 DADOS PARA USAR NOS TESTES:');
  console.log('='.repeat(50));
  console.log(`\nBOARD_ID: ${boardId}`);
  console.log(`COL_TODO_ID: ${columnIds[0] || 'N/A'}`);
  console.log(`COL_DOING_ID: ${columnIds[1] || 'N/A'}`);
  console.log(`COL_DONE_ID: ${columnIds[2] || 'N/A'}`);
  console.log(`\nUSER 1 → ana@qa.com / senha123`);
  console.log(`USER1_ID: ${user1.id}`);
  console.log(`USER1_TOKEN: ${user1Token}`);
  console.log(`\nUSER 2 → bob@qa.com / senha123`);
  console.log(`USER2_ID: ${user2.id}`);
  console.log(`USER2_TOKEN: ${user2Token}`);
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Seed concluído! Use os dados acima no QA Runner.');
  console.log('='.repeat(50) + '\n');

  // Salvar para uso pelo qa-runner
  const { writeFileSync } = await import('fs');
  writeFileSync('./qa-data.json', JSON.stringify({
    boardId,
    columnIds,
    user1: { id: user1.id, token: user1Token, email: 'ana@qa.com', name: 'Ana QA' },
    user2: { id: user2.id, token: user2Token, email: 'bob@qa.com', name: 'Bob QA' },
  }, null, 2));
  console.log('✅ qa-data.json salvo com sucesso.');
}

main().catch(err => {
  console.error('\n❌ ERRO NO SEED:', err.message);
  process.exit(1);
});
