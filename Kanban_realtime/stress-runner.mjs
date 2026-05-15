import { io } from 'socket.io-client';


const SOCKET_URL = 'http://localhost:3000';
const BOARD_ID = 'c4d69abf-f547-46e3-b517-484a9e50a227';
const TOTAL_USERS = 25; // 25 abas simultâneas

// Token da Ana p/ simular a abertura multipla da sala (abrir 25 abas na sala).
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImYyZGQxYTcxLWM2MzctNDdjMC1iZTlhLTcxNDk3ODg4ODM5ZCIsImVtYWlsIjoiYW5hQHFhLmNvbSIsImlhdCI6MTc3NjQ4MTUyMSwiZXhwIjoxNzc2NDgyNDIxfQ.piKJkHWCnBYbfIFdIMaG3ZR5Z-F4irnVwokvEWpq9iY";

async function bootLoadTest() {
  console.log(`🚀 Iniciando Stress Test Realtime com ${TOTAL_USERS} usuários virtuais...`);
  const sockets = [];

  for (let i = 0; i < TOTAL_USERS; i++) {
    const s = io(SOCKET_URL, { auth: { token: TOKEN }, transports: ['websocket'] });
    sockets.push(s);
    
    s.on('connect', () => {
      s.emit('presence:join', { boardId: BOARD_ID, name: `Bot ${i}` });
    });
  }

  // Esperar conectar
  await new Promise(r => setTimeout(r, 2000));
  
  console.log(`✅ ${sockets.length} conexões estabelecidas. Iniciando Bombardeio de Cursores e Movimentos (CPU Bound)...`);

  let packetsSent = 0;
  let moveCardsSent = 0;

  // Emissão de Cursor Agressiva (cada bot emite 10x por seg - 250 req/s)
  const cursorSpamInterval = setInterval(() => {
    sockets.forEach(s => {
      s.emit('cursor:move', { 
        boardId: BOARD_ID, 
        x: Math.random() * 1000, 
        y: Math.random() * 1000, 
        name: 'Bot Stress' 
      });
      packetsSent++;
    });
  }, 100);

  // Emissão Severa de Move de Cartões (10 simulando DND massivo - gerando writes em série no Postgres)
  const colA = '9aa8e6d4-cb22-4743-9fb8-bab96f6c6028';
  const colB = '1858813c-eebf-4264-9fc7-88a58882b931';
  let toggle = true;

  const cardSpamInterval = setInterval(() => {
    // Escolhe alguns bots para mover cartões
    const s = sockets[Math.floor(Math.random() * sockets.length)];
    s.emit('card:move', {
      boardId: BOARD_ID,
      cardId: 'c2465198-cd9a-437a-a368-6d525b1e9cf3',
      toColumnId: toggle ? colA : colB,
      newPosition: Math.floor(Math.random() * 5)
    }, (ack) => {
      moveCardsSent++;
    });
    toggle = !toggle;
  }, 150); // Múltiplos moves quase na mesma janela de DB lock.

  // Monitorar por 10 segundos
  let start = Date.now();
  const reportInterval = setInterval(() => {
    console.log(`📈 ESTATÍSTICA (${(Date.now() - start)/1000}s): Envia: ${packetsSent} cursores | ${moveCardsSent} movimentos DB confirmados pelo servidor.`);
  }, 2000);

  setTimeout(() => {
    clearInterval(cursorSpamInterval);
    clearInterval(cardSpamInterval);
    clearInterval(reportInterval);
    sockets.forEach(s => s.disconnect());
    console.log('\n🛑 Teste finalizado. Fechando conexões. Observe log do Servidor para Memory/CPU Peaks e Locks do Prisma.');
    process.exit(0);
  }, 10000);
}

bootLoadTest();

