/**
 * AuthContext — Provider de inicialização de autenticação
 *
 * Responsabilidade após migração para Zustand:
 *   - Restaurar sessão via refresh token (efeito de montagem)
 *   - Conectar/desconectar socket conforme token muda
 *   - Expor login/logout/register via contexto (dependem de useNavigate)
 *
 * Estado reativo (user, token, socket, isConnected, etc.) vive nos stores:
 *   authStore    → user, token, authLoading
 *   presenceStore → socket, isConnected, isReconnecting
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { setAccessToken } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { usePresenceStore } from '../stores/presenceStore';

const USER_KEY = '@Kanban:user';
const SOCKET_URL = 'http://localhost:3000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const { setUser, setToken, setAuthLoading } = useAuthStore();
  const { setSocket, setIsConnected, setIsReconnecting } = usePresenceStore();

  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const socketRef = useRef(null);
  const logoutRef = useRef(null);

  // ─── Restaurar sessão via refresh token (cookie httpOnly) ─────────────────
  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem(USER_KEY);
      if (!storedUser) {
        setAuthLoading(false);
        return;
      }
      try {
        const response = await api.post('/auth/refresh');
        const { user: userData, accessToken: newToken } = response.data;
        setAccessToken(newToken);
        setToken(newToken);
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } catch {
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Conectar Socket após autenticação ────────────────────────────────────
  const connectSocket = useCallback((authToken) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setIsReconnecting(false);
        logoutRef.current?.();
      }
    });

    newSocket.on('reconnect_attempt', () => setIsReconnecting(true));
    newSocket.on('reconnect_failed', () => setIsReconnecting(false));

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      if (err.message === 'TOKEN_INVALID' || err.message === 'TOKEN_MISSING') {
        setIsReconnecting(false);
        logoutRef.current?.();
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    return newSocket;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sincronizar socket com o token ───────────────────────────────────────
  useEffect(() => {
    if (token && user) {
      connectSocket(token);
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setIsReconnecting(false);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setAuthLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, accessToken: authToken } = response.data;

      if (!authToken) throw new Error('Token não retornado pela API.');

      setAccessToken(authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);

      navigate('/dashboard');
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Falha ao realizar login.';
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [navigate, setAuthLoading, setToken, setUser]);

  // ─── Registro ─────────────────────────────────────────────────────────────
  const register = useCallback(async ({ name, email, password }) => {
    setAuthLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user: userData, accessToken: authToken } = response.data;

      if (!authToken) throw new Error('Token não retornado. Tente fazer login.');

      setAccessToken(authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);

      navigate('/dashboard');
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Falha ao criar conta.';
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [navigate, setAuthLoading, setToken, setUser]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignora falha de rede — estado local é limpo de qualquer forma
    }

    setAccessToken(null);
    localStorage.removeItem(USER_KEY);

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setToken(null);
    setUser(null);
    setSocket(null);
    setIsConnected(false);

    navigate('/login');
  }, [navigate, setToken, setUser, setSocket, setIsConnected]);

  useEffect(() => { logoutRef.current = logout; }, [logout]);

  useEffect(() => {
    const handleForcedLogout = () => logout();
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [logout]);

  // Contexto expõe apenas as ações dependentes de navegação
  const contextValue = useMemo(() => ({ login, logout, register }), [login, logout, register]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook de consumo — lê dos stores Zustand + ações do contexto ─────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const authLoading = useAuthStore((s) => s.authLoading);
  const socket = usePresenceStore((s) => s.socket);
  const isConnected = usePresenceStore((s) => s.isConnected);
  const isReconnecting = usePresenceStore((s) => s.isReconnecting);
  const isAuthenticated = Boolean(token && user);

  return {
    user,
    token,
    socket,
    isAuthenticated,
    isConnected,
    isReconnecting,
    authLoading,
    login: ctx.login,
    logout: ctx.logout,
    register: ctx.register,
  };
}

export default AuthContext;
