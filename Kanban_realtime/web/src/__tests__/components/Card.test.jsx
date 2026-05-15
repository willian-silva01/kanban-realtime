import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from '../../components/Card/Card';

vi.mock('@dnd-kit/sortable', () => ({
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

vi.mock('../../components/CommentsPanel/CommentsPanel', () => ({
  default: () => <div data-testid="comments-panel" />,
}));

const CARD = { id: 'card-1', title: 'Minha Tarefa', description: 'Detalhes da tarefa', columnId: 'col-1' };

describe('Card', () => {
  it('renderiza o título do card', () => {
    render(<Card card={CARD} socket={null} />);
    expect(screen.getByText('Minha Tarefa')).toBeInTheDocument();
  });

  it('renderiza a descrição quando fornecida', () => {
    render(<Card card={CARD} socket={null} />);
    expect(screen.getByText('Detalhes da tarefa')).toBeInTheDocument();
  });

  it('não renderiza descrição quando ausente', () => {
    const cardSemDesc = { ...CARD, description: undefined };
    render(<Card card={cardSemDesc} socket={null} />);
    expect(screen.queryByText('Detalhes da tarefa')).not.toBeInTheDocument();
  });

  it('aplica classe ghost quando isOverlay=true', () => {
    const { container } = render(<Card card={CARD} isOverlay socket={null} />);
    expect(container.firstChild).toHaveClass('card-ghost');
  });

  it('não aplica classe ghost quando isOverlay=false', () => {
    const { container } = render(<Card card={CARD} isOverlay={false} socket={null} />);
    expect(container.firstChild).not.toHaveClass('card-ghost');
  });
});
