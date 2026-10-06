jest.mock('../../config/database', () => require('../mocks/prisma'));
jest.mock('../../modules/board/board.service');
jest.mock('../../websocket/services/presence.service', () => ({
  addUser: jest.fn(async (_boardId, user) => [user]),
  removeUser: jest.fn(async () => []),
}));

const prisma = require('../../config/database');
const boardService = require('../../modules/board/board.service');
const registerBoardHandler = require('../../websocket/handlers/board.handler');

const BOARD = 'board-1';

function createSocket({ rooms = [] } = {}) {
  const handlers = {};
  const roomEmit = jest.fn();
  const socket = {
    id: 'sock-1',
    user: { id: 'user-1' },
    data: {},
    rooms: new Set(['sock-1', ...rooms]),
    middleware: null,
    use: jest.fn((fn) => { socket.middleware = fn; }),
    on: jest.fn((event, fn) => { handlers[event] = fn; }),
    emit: jest.fn(),
    join: jest.fn((room) => socket.rooms.add(room)),
    leave: jest.fn(),
    to: jest.fn(() => ({ emit: roomEmit })),
    volatile: { to: jest.fn(() => ({ emit: roomEmit })) },
  };
  const io = { to: jest.fn(() => ({ emit: roomEmit })) };
  registerBoardHandler(io, socket);
  return { socket, handlers, roomEmit, io };
}

// Executa o middleware socket.use como o Socket.IO faria
const dispatch = (socket, packet) => {
  const next = jest.fn();
  socket.middleware(packet, next);
  return next;
};

beforeEach(() => jest.clearAllMocks());

describe('board.handler — guarda de sala', () => {
  it('descarta evento de board quando o socket não está na sala, respondendo o ack', () => {
    const { socket } = createSocket();
    const ack = jest.fn();

    const next = dispatch(socket, ['card:move', { boardId: BOARD, cardId: 'c1' }, ack]);

    expect(next).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('deixa passar evento quando o socket está na sala', () => {
    const { socket } = createSocket({ rooms: [`board_${BOARD}`] });
    const next = dispatch(socket, ['card:create', { boardId: BOARD, card: {} }]);
    expect(next).toHaveBeenCalled();
  });

  it.each(['board:join', 'board:leave', 'presence:join', 'presence:leave'])(
    '%s não exige estar na sala',
    (event) => {
      const { socket } = createSocket();
      expect(dispatch(socket, [event, { boardId: BOARD }])).toHaveBeenCalled();
    }
  );
});

describe('board.handler — cursor:move', () => {
  it('usa o nome do servidor, ignorando o enviado pelo cliente', () => {
    const { socket, handlers, roomEmit } = createSocket({ rooms: [`board_${BOARD}`] });
    socket.data.userName = 'Ana QA';

    handlers['cursor:move']({ boardId: BOARD, x: 10, y: 20, name: '<img src=x onerror=alert(1)>' });

    expect(roomEmit).toHaveBeenCalledWith('cursor:move', { userId: 'user-1', x: 10, y: 20, name: 'Ana QA' });
  });

  it('descarta coordenadas não numéricas', () => {
    const { handlers, roomEmit } = createSocket({ rooms: [`board_${BOARD}`] });
    handlers['cursor:move']({ boardId: BOARD, x: '10', y: null });
    expect(roomEmit).not.toHaveBeenCalled();
  });
});

describe('board.handler — presence:join', () => {
  it('nega presença em board sem acesso', async () => {
    const { handlers, io } = createSocket();
    boardService._checkAccess.mockRejectedValue(new Error('ACCESS_DENIED'));

    await handlers['presence:join']({ boardId: BOARD, name: 'Falso' });

    expect(io.to).not.toHaveBeenCalled();
  });

  it('registra presença com o nome do banco', async () => {
    const { handlers, roomEmit } = createSocket();
    boardService._checkAccess.mockResolvedValue({ role: 'editor' });
    prisma.user.findUnique.mockResolvedValue({ name: 'Ana QA' });

    await handlers['presence:join']({ boardId: BOARD, name: 'Outra Pessoa' });

    expect(roomEmit).toHaveBeenCalledWith('presence:update', [
      expect.objectContaining({ userId: 'user-1', name: 'Ana QA' }),
    ]);
  });
});
