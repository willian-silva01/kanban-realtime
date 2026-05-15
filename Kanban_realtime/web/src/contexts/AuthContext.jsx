/**
 * AuthContext — Contexto Global de Autenticação
 * Responsável por: armazenar usuário, token em memória, gerenciar socket,
 * expor login/logout e proteger rotas de forma centralizada.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api, { setAccessToken } from '../services/api';

// ─── Constantes ───────────────────────────────────────────────────────────────
const USER_KEY = '@Kanban:user';
const SOCKET_URL = 'http://localhost:3000';

// ─── Criação do Contexto ──────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const navigate = useNavigate();

  // ─── Estado ───────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Access token em memória — não persiste no localStorage
  const [token, setToken] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  // true durante login/register e na restauração inicial de sessão
  const [authLoading, setAuthLoading] = useState(true);

  const socketRef = useRef(null);
  const logoutRef = useRef(null);

  const isAuthenticated = Boolean(token && user);

  // ─── Restaurar sessão via refresh token (cookie httpOnly) ─────────────────
  // Executado uma única vez na montagem. Se houver dados de usuário em
  // localStorage, tenta renovar o access token usando o cookie de refresh.
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
        // Refresh token expirado ou inválido — limpa dados obsoletos
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

    newSocket.on('reconnect_attempt', () => {
      setIsReconnecting(true);
    });

    newSocket.on('reconnect_failed', () => {
      setIsReconnecting(false);
    });

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

      navigate('/board');
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
  }, [navigate]);

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

      navigate('/board');
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
  }, [navigate]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout'); // limpa o cookie httpOnly no servidor
    } catch {
      // ignora falha de rede — o estado local é limpo de qualquer forma
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
  }, [navigate]);

  useEffect(() => { logoutRef.current = logout; }, [logout]);

  // Ouve evento disparado pelo interceptor Axios quando o refresh falha
  useEffect(() => {
    const handleForcedLogout = () => logout();
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [logout]);

  // ─── Valor do contexto ────────────────────────────────────────────────────
  const contextValue = useMemo(
    () => ({
      user,
      token,
      socket,
      isAuthenticated,
      isConnected,
      isReconnecting,
      authLoading,
      login,
      logout,
      register,
    }),
    [user, token, socket, isAuthenticated, isConnected, isReconnecting, authLoading, login, logout, register]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook de consumo ──────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
