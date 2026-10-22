import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BoardHeader from '../../components/BoardHeader/BoardHeader';
import { usePresenceStore } from '../../stores/presenceStore';
import { useAuthStore } from '../../stores/authStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => mockNavigate }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock('../../components/NotificationBell/NotificationBell', () => ({ default: () => <div /> }));
vi.mock('../../components/BoardTitle/BoardTitle', () => ({ default: () => <span>Board</span> }));
// themeStore lê window.matchMedia ao ser importado (indisponível no jsdom)
vi.mock('../../stores/themeStore', () => ({
  useThemeStore: (selector) => selector({ theme: 'dark', toggleTheme: vi.fn() }),
}));

const users = (n) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}`, name: `User ${i}` }));

function renderHeader(props = {}) {
  const handlers = { onToggleActivity: vi.fn(), onOpenEmailPrefs: vi.fn() };
  render(
    <MemoryRouter>
      <BoardHeader boardId="b1" activityOpen={false} {...handlers} {...props} />
    </MemoryRouter>
  );
  return handlers;
}

describe('BoardHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { id: 'u0', name: 'Ana' } });
    usePresenceStore.setState({ socket: null, isConnected: true, isReconnecting: false, onlineUsers: [] });
  });

  it('botão Boards volta ao dashboard', () => {
    renderHeader();
    fireEvent.click(screen.getByTitle('Voltar aos boards'));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('mostra no máximo 3 avatares online e "+N" com os nomes restantes', () => {
    usePresenceStore.setState({ onlineUsers: users(5) });
    renderHeader();

    expect(screen.getByText('Online (5)')).toBeInTheDocument();
    expect(document.querySelectorAll('.header-online-avatar')).toHaveLength(3);
    expect(screen.getByText('+2')).toHaveAttribute('title', 'User 3, User 4');
  });

  it('não mostra "+N" com 3 usuários ou menos', () => {
    usePresenceStore.setState({ onlineUsers: users(3) });
    renderHeader();
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it('botão Atividades alterna o painel e reflete o estado', () => {
    const { onToggleActivity } = renderHeader({ activityOpen: true });
    const btn = screen.getByRole('button', { name: /atividades/i });

    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(btn);
    expect(onToggleActivity).toHaveBeenCalled();
  });

  it('toggle de cursores alterna a preferência na store', () => {
    usePresenceStore.setState({ showCursors: true });
    renderHeader();
    const btn = screen.getByTitle(/ocultar cursores/i);

    expect(btn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(btn);

    expect(usePresenceStore.getState().showCursors).toBe(false);
    expect(screen.getByTitle(/mostrar cursores/i)).toHaveAttribute('aria-pressed', 'false');
  });

  it('botão de preferências de e-mail abre o modal', () => {
    const { onOpenEmailPrefs } = renderHeader();
    fireEvent.click(screen.getByTitle('Preferências de notificação por e-mail'));
    expect(onOpenEmailPrefs).toHaveBeenCalled();
  });
});
