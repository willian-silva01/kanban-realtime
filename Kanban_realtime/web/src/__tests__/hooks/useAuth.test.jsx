import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';

// Mock do socket.io-client
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    connected: false,
  })),
}));

// Mock do módulo api
vi.mock('../../services/api', () => {
  const mockApi = {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: mockApi,
    setAccessToken: vi.fn(),
  };
});

import api from '../../services/api';

// Componente auxiliar para acessar o contexto
function AuthConsumer({ onRender }) {
  const ctx = useAuth();
  onRender(ctx);
  return <div data-testid="consumer" />;
}

function renderWithAuth(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  useAuthStore.getState().reset();
  usePresenceStore.getState().reset();
  // Por padrão, /auth/refresh falha (sem sessão ativa)
  api.post.mockRejectedValue({ response: { status: 401 } });
});

describe('useAuth — fora do Provider', () => {
  it('deve lançar erro se usado fora do AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      renderWithAuth(<AuthConsumer onRender={() => {}} />)
    ).toThrow('useAuth deve ser usado dentro de <AuthProvider>');
    consoleError.mockRestore();
  });
});

describe('AuthProvider — estado inicial', () => {
  it('deve iniciar como não autenticado quando não há sessão salva', async () => {
    let capturedCtx;
    renderWithAuth(
      <AuthProvider>
        <AuthConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(capturedCtx.authLoading).toBe(false);
    });

    expect(capturedCtx.isAuthenticated).toBe(false);
    expect(capturedCtx.user).toBeNull();
  });
});

describe('AuthProvider — login', () => {
  it('deve autenticar e definir usuário em estado de sucesso', async () => {
    // Sem usuário em localStorage → refresh não é chamado no mount
    // Primeira (e única) chamada a api.post será o login
    const mockUser = { id: 'user-1', email: 'teste@test.com', name: 'Teste' };
    api.post.mockResolvedValueOnce({ data: { user: mockUser, accessToken: 'access-token' } });

    let capturedCtx;
    renderWithAuth(
      <AuthProvider>
        <AuthConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>
    );

    await waitFor(() => expect(capturedCtx.authLoading).toBe(false));

    let result;
    await act(async () => {
      result = await capturedCtx.login({ email: 'teste@test.com', password: 'senha123' });
    });

    expect(result.success).toBe(true);
    expect(capturedCtx.user).toEqual(mockUser);
    expect(capturedCtx.isAuthenticated).toBe(true);
  });

  it('deve retornar success:false para credenciais inválidas', async () => {
    // Sem localStorage → refresh não é chamado; login falha
    api.post.mockRejectedValueOnce({
      response: { data: { error: { message: 'Email ou senha inválidos' } } },
    });

    let capturedCtx;
    renderWithAuth(
      <AuthProvider>
        <AuthConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>
    );

    await waitFor(() => expect(capturedCtx.authLoading).toBe(false));

    let result;
    await act(async () => {
      result = await capturedCtx.login({ email: 'x@x.com', password: 'errado' });
    });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/inválidos/i);
  });
});

describe('AuthProvider — logout', () => {
  it('deve limpar estado ao fazer logout', async () => {
    // Simula usuário logado via localStorage
    const mockUser = { id: 'user-1', name: 'User' };
    localStorage.setItem('@Kanban:user', JSON.stringify(mockUser));
    api.post
      .mockResolvedValueOnce({ data: { user: mockUser, accessToken: 'token' } }) // refresh no mount
      .mockResolvedValueOnce({}); // logout

    let capturedCtx;
    renderWithAuth(
      <AuthProvider>
        <AuthConsumer onRender={(ctx) => { capturedCtx = ctx; }} />
      </AuthProvider>
    );

    await waitFor(() => expect(capturedCtx.authLoading).toBe(false));

    await act(async () => {
      await capturedCtx.logout();
    });

    expect(capturedCtx.user).toBeNull();
    expect(capturedCtx.isAuthenticated).toBe(false);
    expect(localStorage.getItem('@Kanban:user')).toBeNull();
  });
});
