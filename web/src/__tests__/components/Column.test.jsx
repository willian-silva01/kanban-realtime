import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Column from '../../components/Column/Column';

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => <div>{children}</div>,
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  })),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: vi.fn(() => '') } },
}));

vi.mock('../../components/Card/Card', () => ({
  default: ({ card }) => <div data-testid={`card-${card.id}`}>{card.title}</div>,
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Check: () => <span>✓</span>,
  X: () => <span>✕</span>,
  Trash2: () => <span>🗑</span>,
}));

const mockUpdateColumn = vi.fn();
const mockRemoveColumn = vi.fn();
const mockAddCard = vi.fn();
vi.mock('../../stores/boardStore', () => ({
  useBoardStore: () => ({ updateColumn: mockUpdateColumn, removeColumn: mockRemoveColumn, addCard: mockAddCard }),
}));

vi.mock('../../services/api', () => ({
  default: {
    put: vi.fn(),
    delete: vi.fn(),
    post: vi.fn(),
  },
}));

import api from '../../services/api';

const COLUMN = { id: 'col-1', name: 'To Do' };
const CARDS = [
  { id: 'card-1', title: 'Tarefa A', columnId: 'col-1' },
  { id: 'card-2', title: 'Tarefa B', columnId: 'col-1' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Column', () => {
  it('renderiza o cabeçalho da coluna', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('exibe a contagem de cards', () => {
    render(<Column column={COLUMN} cards={CARDS} socket={null} boardId="board-1" />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renderiza os cards da coluna', () => {
    render(<Column column={COLUMN} cards={CARDS} socket={null} boardId="board-1" />);
    expect(screen.getByTestId('card-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-card-2')).toBeInTheDocument();
  });

  it('exibe botão de adicionar card', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" />);
    expect(screen.getByRole('button', { name: /add card/i })).toBeInTheDocument();
  });

  it('abre input de renomeação ao dar duplo clique no título', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" />);
    fireEvent.dblClick(screen.getByTestId('column-title'));
    expect(screen.getByTestId('column-rename-input')).toBeInTheDocument();
    expect(screen.getByTestId('column-rename-input')).toHaveValue('To Do');
  });

  it('cancela renomeação ao pressionar Escape', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" />);
    fireEvent.dblClick(screen.getByTestId('column-title'));
    fireEvent.keyDown(screen.getByTestId('column-rename-input'), { key: 'Escape' });
    expect(screen.queryByTestId('column-rename-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('column-title')).toBeInTheDocument();
  });

  it('renomeia coluna ao confirmar com Enter', async () => {
    const updatedColumn = { id: 'col-1', name: 'Em Andamento', cards: [] };
    api.put.mockResolvedValue({ data: { data: updatedColumn } });
    const mockSocket = { emit: vi.fn() };

    render(<Column column={COLUMN} cards={[]} socket={mockSocket} boardId="board-1" />);
    fireEvent.dblClick(screen.getByTestId('column-title'));

    const input = screen.getByTestId('column-rename-input');
    fireEvent.change(input, { target: { value: 'Em Andamento' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/boards/board-1/columns/col-1', { name: 'Em Andamento' });
      expect(mockUpdateColumn).toHaveBeenCalledWith(updatedColumn);
      expect(mockSocket.emit).toHaveBeenCalledWith('column:update', { boardId: 'board-1', column: updatedColumn });
    });

    expect(screen.queryByTestId('column-rename-input')).not.toBeInTheDocument();
  });

  it('exibe erro ao tentar salvar nome vazio', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" />);
    fireEvent.dblClick(screen.getByTestId('column-title'));

    const input = screen.getByTestId('column-rename-input');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('Nome não pode ser vazio')).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('não exibe botão de delete sem permissão', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" canDelete={false} />);
    expect(screen.queryByTestId('column-delete-btn')).not.toBeInTheDocument();
  });

  it('exibe botão de delete com permissão', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" canDelete={true} />);
    expect(screen.getByTestId('column-delete-btn')).toBeInTheDocument();
  });

  it('abre confirmação ao clicar no botão de delete', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" canDelete={true} />);
    fireEvent.click(screen.getByTestId('column-delete-btn'));
    expect(screen.getByTestId('column-delete-confirm')).toBeInTheDocument();
    expect(screen.getByTestId('column-delete-cancel')).toBeInTheDocument();
    expect(screen.getByText('Deletar coluna?')).toBeInTheDocument();
  });

  it('cancela delete ao clicar em Não', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} boardId="board-1" canDelete={true} />);
    fireEvent.click(screen.getByTestId('column-delete-btn'));
    fireEvent.click(screen.getByTestId('column-delete-cancel'));
    expect(screen.queryByTestId('column-delete-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('column-title')).toBeInTheDocument();
  });

  it('deleta coluna ao confirmar com Sim', async () => {
    api.delete.mockResolvedValue({});
    const mockSocket = { emit: vi.fn() };

    render(
      <Column column={COLUMN} cards={[]} socket={mockSocket} boardId="board-1" canDelete={true} />
    );
    fireEvent.click(screen.getByTestId('column-delete-btn'));
    fireEvent.click(screen.getByTestId('column-delete-confirm'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/boards/board-1/columns/col-1');
      expect(mockRemoveColumn).toHaveBeenCalledWith('col-1');
      expect(mockSocket.emit).toHaveBeenCalledWith('column:delete', {
        boardId: 'board-1',
        columnId: 'col-1',
      });
    });
  });
});
