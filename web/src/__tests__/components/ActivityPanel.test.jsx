import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import ActivityPanel from '../../components/ActivityPanel/ActivityPanel';
import { useBoardStore } from '../../stores/boardStore';
import api from '../../services/api';

vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }));

const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();

const history = [
  {
    id: 'a1',
    action: 'CARD_MOVED',
    user: { name: 'Ana' },
    metadata: { cardTitle: 'Login', toColumnName: 'Doing' },
    createdAt: recent,
  },
  // atividade antiga, sem toColumnName: usa o nome atual da coluna
  { id: 'a2', action: 'CARD_MOVED', user: { name: 'Bob' }, metadata: { cardTitle: 'API', toColumnId: 'c-done' }, createdAt: recent },
];

function setup(props = {}) {
  const handlers = {};
  const socket = { on: vi.fn((e, fn) => { handlers[e] = fn; }), off: vi.fn() };
  const onClose = vi.fn();
  render(<ActivityPanel socket={socket} boardId="b1" isOpen onClose={onClose} {...props} />);
  return { handlers, onClose };
}

describe('ActivityPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBoardStore.setState({ columns: [{ id: 'c-done', name: 'Done' }] });
    api.get.mockResolvedValue({ data: { success: true, data: history } });
  });

  it('título em português', () => {
    setup();
    expect(screen.getByRole('heading', { name: /atividades/i })).toBeInTheDocument();
  });

  it('CARD_MOVED mostra a coluna destino (do metadata ou da coluna atual)', async () => {
    setup();
    expect(await screen.findByText(/moveu "Login" para "Doing"/)).toBeInTheDocument();
    expect(screen.getByText(/moveu "API" para "Done"/)).toBeInTheDocument();
  });

  it('exibe tempo relativo', async () => {
    setup();
    expect(await screen.findAllByText(/há 5 min/)).toHaveLength(2);
  });

  it('adiciona atividade recebida via WebSocket no topo', async () => {
    const { handlers } = setup();
    await screen.findByText(/moveu "Login"/);

    act(() =>
      handlers['activity:new']({
        type: 'COMMENT_CREATED',
        user: { name: 'Carla' },
        metadata: { cardTitle: 'Bug' },
        createdAt: new Date().toISOString(),
      })
    );

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Carla comentou em "Bug"');
    expect(items[0]).toHaveTextContent('agora');
  });

  it('tipo desconhecido usa texto genérico em português', async () => {
    api.get.mockResolvedValue({
      data: { success: true, data: [{ id: 'x', action: 'NOVO_TIPO', user: { name: 'Ana' }, createdAt: recent }] },
    });
    setup();
    expect(await screen.findByText(/atualizou o board/)).toBeInTheDocument();
  });

  it('fecha com o botão e com Esc', async () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByTitle('Fechar (Esc)'));
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(2));
  });

  it('não renderiza quando fechado, mas já carrega o histórico', () => {
    setup({ isOpen: false });
    expect(screen.queryByRole('heading', { name: /atividades/i })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/boards/b1/activities');
  });
});
