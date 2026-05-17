import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Board from '../../components/Board/Board';
import { useBoardStore } from '../../stores/boardStore';

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }) => <div data-testid="drag-overlay">{children}</div>,
  closestCorners: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => <div>{children}</div>,
  arrayMove: vi.fn((arr) => arr),
  horizontalListSortingStrategy: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

vi.mock('../../components/Column/Column', () => ({
  default: ({ column }) => <div data-testid={`col-${column.id}`}>{column.name}</div>,
}));

vi.mock('../../components/Board/CursorsLayer', () => ({
  default: () => <div data-testid="cursors-layer" />,
}));

function makeSocket() {
  const listeners = {};
  return {
    on: vi.fn((event, cb) => { listeners[event] = cb; }),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    _trigger: (event, payload) => listeners[event]?.(payload),
  };
}

const USER = { id: 'user-1', name: 'User Test' };

beforeEach(() => {
  useBoardStore.getState().reset();
});

describe('Board', () => {
  it('exibe skeleton antes de receber board:sync', () => {
    const socket = makeSocket();
    render(<Board socket={socket} boardId="board-1" user={USER} />);
    // boardSynced começa false — mostra skeleton, não o dnd-context
    expect(screen.queryByTestId('dnd-context')).not.toBeInTheDocument();
  });

  it('registra handlers de socket ao montar', () => {
    const socket = makeSocket();
    render(<Board socket={socket} boardId="board-1" user={USER} />);
    expect(socket.on).toHaveBeenCalledWith('board:sync', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('card:move', expect.any(Function));
  });

  it('renderiza colunas após receber board:sync', async () => {
    const socket = makeSocket();
    render(<Board socket={socket} boardId="board-1" user={USER} />);

    await act(async () => {
      socket._trigger('board:sync', {
        columns: [{ id: 'col-1', name: 'To Do' }, { id: 'col-2', name: 'Done' }],
        cards: [],
      });
    });

    expect(screen.getByTestId('col-col-1')).toBeInTheDocument();
    expect(screen.getByTestId('col-col-2')).toBeInTheDocument();
  });

  it('remove handlers de socket ao desmontar', () => {
    const socket = makeSocket();
    const { unmount } = render(<Board socket={socket} boardId="board-1" user={USER} />);
    unmount();
    expect(socket.off).toHaveBeenCalledWith('board:sync', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith('card:move', expect.any(Function));
  });

  it('não registra handlers quando socket é nulo', () => {
    render(<Board socket={null} boardId="board-1" user={USER} />);
    // Sem socket — apenas exibe skeleton sem lançar erro
    expect(screen.queryByTestId('dnd-context')).not.toBeInTheDocument();
  });
});
