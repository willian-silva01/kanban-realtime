const { io } = require('socket.io-client');
const t = process.argv[2];
const boardId = process.argv[3];
const cardId = process.argv[4];
const toColumnId = process.argv[5];

const s = io('http://localhost:3000', { auth: { token: t }, transports: ['websocket'] });
s.on('connect', () => {
  console.log('Connected:', s.id);
  s.emit('board:join', { boardId }, (ack) => {
    console.log('board:join ack:', JSON.stringify(ack));
    s.emit('card:move', { boardId, cardId, toColumnId, newPosition: 0 }, (moveAck) => {
      console.log('card:move ack:', JSON.stringify(moveAck));
      s.disconnect();
      process.exit(0);
    });
    setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
  });
});
s.on('connect_error', e => { console.log('Error:', e.message); process.exit(1); });
