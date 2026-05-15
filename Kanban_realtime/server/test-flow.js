const prisma = require('./src/config/database');
const authService = require('./src/modules/auth/auth.service');
const boardService = require('./src/modules/board/board.service');
const columnService = require('./src/modules/column/column.service');
const cardService = require('./src/modules/card/card.service');

async function runTests() {
  console.log('Iniciando testes E2E (Service Level)...');
  try {
    // 1. Limpar banco de resquícios de testes anteriores (Cuidado para não quebrar tabelas, usaremos apenas nomes unicos)
    const testEmail = `test_${Date.now()}@test.com`;

    // 2. Registro e Login
    console.log('[Auth] Registrando usuário...');
    const result = await authService.register({
      name: 'Test User',
      email: testEmail,
      password: 'password123',
    });
    const userId = result.user.id;
    console.log('[Auth] OK. Usuário criado:', userId);

    // 3. Criar Board
    console.log('[Board] Criando board...');
    const board = await boardService.create(userId, { name: 'Board de Teste' });
    console.log('[Board] OK. Board criado:', board.id);

    // 4. Criar Colunas
    console.log('[Column] Criando colunas (Todo, Doing, Done)...');
    const colTodo = await columnService.create(board.id, userId, { name: 'Todo' });
    const colDoing = await columnService.create(board.id, userId, { name: 'Doing' });
    const colDone = await columnService.create(board.id, userId, { name: 'Done' });
    console.log('[Column] OK. Colunas criadas.');

    // 5. Criar Cards
    console.log('[Card] Criando cards...');
    const card1 = await cardService.create(colTodo.id, userId, { title: 'Tarefa 1', description: 'Desc 1' });
    const card2 = await cardService.create(colTodo.id, userId, { title: 'Tarefa 2', description: 'Desc 2' });
    console.log('[Card] OK. Cards criados em TODO.');

    // 6. Testar Movimento (Move Card 1 from Todo to Doing)
    console.log('[Card] Movendo Tarefa 1 para DOING...');
    await cardService.move(card1.id, userId, { toColumnId: colDoing.id, newPosition: 0 });
    console.log('[Card] OK. Tarefa movida com sucesso.');

    console.log('\n--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
  } catch (error) {
    console.error('\n!!! ERRO NO TESTE:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
