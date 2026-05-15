import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
}));

const COLUMN = { id: 'col-1', title: 'To Do' };
const CARDS = [
  { id: 'card-1', title: 'Tarefa A', columnId: 'col-1' },
  { id: 'card-2', title: 'Tarefa B', columnId: 'col-1' },
];

describe('Column', () => {
  it('renderiza o cabeçalho da coluna', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} />);
    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('exibe a contagem de cards', () => {
    render(<Column column={COLUMN} cards={CARDS} socket={null} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renderiza os cards da coluna', () => {
    render(<Column column={COLUMN} cards={CARDS} socket={null} />);
    expect(screen.getByTestId('card-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-card-2')).toBeInTheDocument();
  });

  it('exibe botão de adicionar card', () => {
    render(<Column column={COLUMN} cards={[]} socket={null} />);
    expect(screen.getByRole('button', { name: /add card/i })).toBeInTheDocument();
  });
});
