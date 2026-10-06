import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import BoardTitle from '../../components/BoardTitle/BoardTitle';
import { useBoardStore } from '../../stores/boardStore';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import api from '../../services/api';

vi.mock('../../services/api', () => ({ default: { put: vi.fn() } }));

const BOARD_ID = 'board-1';

function setup({ role = 'admin', boardName = 'Sprint 1' } = {}) {
  const handlers = {};
  const socket = {
    on: vi.fn((event, fn) => { handlers[event] = fn; }),
    off: vi.fn(),
  };
  useAuthStore.setState({ user: { id: 'u1', name: 'Ana' } });
  usePresenceStore.setState({ socket });
  useBoardStore.setState({ boardName, boardMembers: [{ id: 'u1', role }] });
  render(<BoardTitle boardId={BOARD_ID} />);
  return { handlers };
}

describe('BoardTitle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBoardStore.getState().reset();
  });

  it('exibe o nome do board', () => {
    setup();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
  });

  it('admin renomeia com Enter: atualiza a store e chama PUT /boards/:id', async () => {
    api.put.mockResolvedValue({});
    setup();

    fireEvent.click(screen.getByText('Sprint 1'));
    const input = screen.getByLabelText('Nome do board');
    fireEvent.change(input, { target: { value: '  Sprint 2  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useBoardStore.getState().boardName).toBe('Sprint 2');
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith(`/boards/${BOARD_ID}`, { name: 'Sprint 2' });
  });

  it('Esc cancela sem salvar', () => {
    setup();

    fireEvent.click(screen.getByText('Sprint 1'));
    const input = screen.getByLabelText('Nome do board');
    fireEvent.change(input, { target: { value: 'Outro' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(api.put).not.toHaveBeenCalled();
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
  });

  it('não salva nome vazio ou inalterado', () => {
    setup();

    fireEvent.click(screen.getByText('Sprint 1'));
    fireEvent.change(screen.getByLabelText('Nome do board'), { target: { value: '   ' } });
    fireEvent.blur(screen.getByLabelText('Nome do board'));

    expect(api.put).not.toHaveBeenCalled();
    expect(useBoardStore.getState().boardName).toBe('Sprint 1');
  });

  it('reverte o nome se o PUT falhar', async () => {
    api.put.mockRejectedValue({ response: { data: { message: 'Sem permissão' } } });
    setup();

    fireEvent.click(screen.getByText('Sprint 1'));
    const input = screen.getByLabelText('Nome do board');
    fireEvent.change(input, { target: { value: 'Sprint 2' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(useBoardStore.getState().boardName).toBe('Sprint 1'));
    expect(screen.getByTitle('Sem permissão')).toBeInTheDocument();
  });

  it('quem não é admin vê o nome mas não consegue editar', () => {
    setup({ role: 'editor' });

    fireEvent.click(screen.getByText('Sprint 1'));

    expect(screen.queryByLabelText('Nome do board')).not.toBeInTheDocument();
  });

  it('aplica board:renamed recebido de outro cliente', () => {
    const { handlers } = setup();

    act(() => handlers['board:renamed']({ boardId: BOARD_ID, name: 'Renomeado' }));

    expect(screen.getByText('Renomeado')).toBeInTheDocument();
  });

  it('ignora board:renamed de outro board', () => {
    const { handlers } = setup();

    act(() => handlers['board:renamed']({ boardId: 'outro', name: 'X' }));

    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
  });
});
