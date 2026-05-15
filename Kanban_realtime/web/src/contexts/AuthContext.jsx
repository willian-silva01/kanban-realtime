/**
 * AuthContext — Contexto Global de Autenticação
 * Responsável por: armazenar usuário, token, gerenciar socket,
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
import api from '../services/api';

// ─── Constantes ─────────────────────────────────────────────────────────────
const TOKEN_KEY = '@Kanban:token';
const USER_KEY = '@Kanban:user';
const SOCKET_URL = 'http://localhost:3000';

// ─── Criação do Contexto ─────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const navigate = useNavigate();

  // ─── Estado ─────────────────────────────────────────────────────────────
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Ref para evitar dupla conexão no StrictMode do React
  const socketRef = useRef(null);

  // CORRIGIDO (MÉDIA-03): Ref para capturar sempre a versão mais recente de logout
  // dentro dos event handlers do socket (evita closure stale)
  const logoutRef = useRef(null);

  // Indica se o usuário está autenticado (tem token válido + user)
  const isAuthenticated = Boolean(token && user);

  // ─── Iniciar Socket após autenticação ────────────────────────────────────
  const connectSocket = useCallback((authToken) => {
    // Limpa socket anterior se existir
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Servidor derrubou — provavelmente token expirou
        // CORRIGIDO: usa logoutRef para sempre chamar a versão atual de logout
        logoutRef.current?.();
      }
    });

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      // CORRIGIDO: usa logoutRef para evitar closure stale
      if (err.message === 'TOKEN_INVALID' || err.message === 'TOKEN_MISSING') {
        logoutRef.current?.();
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    return newSocket;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persistir dados e conectar socket quando token muda ─────────────────
  useEffect(() => {
    if (token && user) {
      connectSocket(token);
    } else {
      // Se deslogou, limpar socket
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Login ───────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    setAuthLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token: authToken } = response.data;

      if (!authToken) throw new Error('Token não retornado pela API.');

      // Persistir
      localStorage.setItem(TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);

      // Redirecionar para o board
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

  // ─── Registro ────────────────────────────────────────────────────────────
  const register = useCallback(async ({ name, email, password }) => {
    setAuthLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { user: userData, token: authToken } = response.data;

      // Suporte ao wrapper { data: { user, token } }
      const resolvedToken = authToken || response.data?.data?.token;
      const resolvedUser = userData || response.data?.data?.user;

      if (!resolvedToken) throw new Error('Token não retornado. Tente fazer login.');

      // Persistir
      localStorage.setItem(TOKEN_KEY, resolvedToken);
      localStorage.setItem(USER_KEY, JSON.stringify(resolvedUser));

      setToken(resolvedToken);
      setUser(resolvedUser);

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

  // ─── Logout ──────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
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

  // CORRIGIDO (MÉDIA-03): mantém logoutRef atualizado com a versão mais recente de logout
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // CORRIGIDO (MÉDIA-01): ouve evento 'auth:logout' disparado pelo interceptor do Axios
  // quando uma resposta 401 é recebida — garante que o React state é limpo corretamente
  useEffect(() => {
    const handleForcedLogout = () => logout();
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, [logout]);

  // ─── Valor do contexto (memoizado para evitar re-renders) ────────────────
  const contextValue = useMemo(
    () => ({
      user,
      token,
      socket,
      isAuthenticated,
      isConnected,
      authLoading,
      login,
      logout,
      register,
    }),
    [user, token, socket, isAuthenticated, isConnected, authLoading, login, logout, register]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook de consumo ─────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
