import { describe, it, expect, beforeEach } from 'vitest';
import { useBoardStore } from '../../stores/boardStore';

const card = (id, columnId, position, extra = {}) => ({ id, columnId, position, title: id, ...extra });

const columnOrder = (columnId) =>
  useBoardStore
    .getState()
    .cards.filter((c) => c.columnId === columnId)
    .sort((a, b) => a.position - b.position)
    .map((c) => c.id);

describe('boardStore.moveCard (evento card:move de outro cliente)', () => {
  beforeEach(() => {
    useBoardStore.getState().reset();
    useBoardStore.getState().setCards([
      card('a1', 'A', 0),
      card('a2', 'A', 1),
      card('a3', 'A', 2),
      card('b1', 'B', 0, { labels: [{ id: 'l1' }], assignees: [{ id: 'u1' }] }),
      card('b2', 'B', 1),
      card('c1', 'C', 0),
    ]);
  });

  it('insere o card na posição relativa à coluna destino, não ao array global', () => {
    useBoardStore.getState().moveCard({
      card: card('b1', 'C', 1),
      fromColumnId: 'B',
      toColumnId: 'C',
    });

    expect(columnOrder('C')).toEqual(['c1', 'b1']);
  });

  it('insere no meio da coluna destino e reindexa as posições', () => {
    useBoardStore.getState().moveCard({
      card: card('b2', 'A', 1),
      fromColumnId: 'B',
      toColumnId: 'A',
    });

    expect(columnOrder('A')).toEqual(['a1', 'b2', 'a2', 'a3']);
    const positions = useBoardStore
      .getState()
      .cards.filter((c) => c.columnId === 'A')
      .sort((a, b) => a.position - b.position)
      .map((c) => c.position);
    expect(positions).toEqual([0, 1, 2, 3]);
  });

  it('reindexa a coluna de origem sem deixar buracos', () => {
    useBoardStore.getState().moveCard({
      card: card('a1', 'C', 0),
      fromColumnId: 'A',
      toColumnId: 'C',
    });

    const origin = useBoardStore.getState().cards.filter((c) => c.columnId === 'A');
    expect(origin.map((c) => [c.id, c.position])).toEqual([
      ['a2', 0],
      ['a3', 1],
    ]);
  });

  it('reordena dentro da mesma coluna', () => {
    useBoardStore.getState().moveCard({
      card: card('a3', 'A', 0),
      fromColumnId: 'A',
      toColumnId: 'A',
    });

    expect(columnOrder('A')).toEqual(['a3', 'a1', 'a2']);
  });

  it('preserva labels e responsáveis do card local (o payload do servidor não os inclui)', () => {
    useBoardStore.getState().moveCard({
      card: card('b1', 'C', 0),
      fromColumnId: 'B',
      toColumnId: 'C',
    });

    const moved = useBoardStore.getState().cards.find((c) => c.id === 'b1');
    expect(moved.labels).toEqual([{ id: 'l1' }]);
    expect(moved.assignees).toEqual([{ id: 'u1' }]);
  });

  it('não altera cards de outras colunas', () => {
    useBoardStore.getState().moveCard({
      card: card('a1', 'C', 0),
      fromColumnId: 'A',
      toColumnId: 'C',
    });

    expect(columnOrder('B')).toEqual(['b1', 'b2']);
  });
});
