/**
 * App.jsx — Roteamento principal da aplicação
 *
 * Estrutura:
 *   /login        → tela de login (pública)
 *   /register     → tela de cadastro (pública)
 *   /dashboard    → seleção de workspace e boards (PROTEGIDO)
 *   /board/:id    → board principal (PROTEGIDO)
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import Board from './components/Board/Board';
import ActivityPanel from './components/ActivityPanel/ActivityPanel';
import NotificationBell from './components/NotificationBell/NotificationBell';
import ConnectionStatus from './components/ConnectionStatus/ConnectionStatus';
import EmailPreferences from './components/EmailPreferences/EmailPreferences';

import { useAuth } from './contexts/AuthContext';
import { useAuthStore } from './stores/authStore';
import { usePresenceStore } from './stores/presenceStore';
import { useBoardStore } from './stores/boardStore';
import './index.css';

// ─── Tela de Board (área protegida) ─────────────────────────────────────────
function BoardPage() {
  const { boardId } = useParams();
  const { logout } = useAuth();
  const socket = usePresenceStore((s) => s.socket);
  const isConnected = usePresenceStore((s) => s.isConnected);
  const isReconnecting = usePresenceStore((s) => s.isReconnecting);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);
  const setOnlineUsers = usePresenceStore((s) => s.setOnlineUsers);
  const user = useAuthStore((s) => s.user);
  const boardError = useBoardStore((s) => s.boardError);
  const setBoardError = useBoardStore((s) => s.setBoardError);
  const [showEmailPrefs, setShowEmailPrefs] = useState(false);

  // Entra no board e anuncia presença ao conectar (ou reconectar)
  useEffect(() => {
    if (!socket || !boardId) return;

    const joinBoard = () => {
      setBoardError(null);
      socket.emit('board:join', { boardId }, (response) => {
        if (response && !response.success) {
          setBoardError(response.message || 'Não foi possível entrar no board.');
        }
      });

      socket.emit('presence:join', { boardId, name: user?.name || 'Anônimo' });
    };

    const onPresenceUpdate = (users) => setOnlineUsers(users);

    if (socket.connected) {
      joinBoard();
    }

    socket.on('connect', joinBoard);
    socket.on('presence:update', onPresenceUpdate);

    return () => {
      socket.off('connect', joinBoard);
      socket.off('presence:update', onPresenceUpdate);

      if (socket.connected) {
        socket.emit('presence:leave', { boardId });
      }
    };
  }, [socket, boardId, user, setBoardError, setOnlineUsers]);

  return (
    <div className="app-container">
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="header">
        <h1>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="7" height="11" rx="2" fill="#A881FC" />
            <rect x="14" y="3" width="7" height="7" rx="2" fill="#6A38E3" />
            <rect x="14" y="14" width="7" height="7" rx="2" fill="#A881FC" opacity="0.7" />
          </svg>
          Kanban Realtime
        </h1>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Usuários Online */}
          {onlineUsers.length > 0 && (
            <div className="header-online" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: '#8E9BAE', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Online ({onlineUsers.length})
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {onlineUsers.map((u) => (
                  <div
                    key={u.userId}
                    title={u.name}
                    style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6A38E3, #A881FC)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 'bold',
                      border: '2px solid var(--board-bg)', color: '#FFF',
                    }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indicador de Conexão */}
          <ConnectionStatus isConnected={isConnected} isReconnecting={isReconnecting} />

          {/* Sino de Notificações */}
          <NotificationBell socket={socket} />

          {/* Perfil + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6A38E3, #A881FC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', fontWeight: 'bold', color: '#FFF',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
              title={user?.name}
            >
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>

            <button
              className="header-email-pref"
              onClick={() => setShowEmailPrefs(true)}
              title="Preferências de e-mail"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#9CA3AF',
                borderRadius: '8px',
                padding: '6px 8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#E8EAED'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#9CA3AF'; }}
            >
              ⚙
            </button>

            <button
              id="logout-btn"
              onClick={logout}
              title="Sair"
              style={{
                background: 'rgba(227, 56, 77, 0.1)',
                border: '1px solid rgba(227, 56, 77, 0.2)',
                color: '#E3384D',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(227, 56, 77, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(227, 56, 77, 0.1)';
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* ─── Activity Panel ──────────────────────────────────── */}
      <ActivityPanel socket={socket} boardId={boardId} />

      {/* ─── Board Principal ─────────────────────────────────── */}
      {boardError ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flex: 1, gap: '12px',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            {boardError}
          </p>
          <button
            onClick={() => socket?.connected && socket.emit('board:join', { boardId }, (res) => {
              if (res?.success) setBoardError(null);
              else setBoardError(res?.message || 'Erro ao tentar novamente.');
            })}
            style={{
              background: 'rgba(106, 56, 227, 0.15)',
              border: '1px solid rgba(106, 56, 227, 0.35)',
              color: '#A881FC',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <Board socket={socket} boardId={boardId} user={user} />
      )}

      {showEmailPrefs && <EmailPreferences onClose={() => setShowEmailPrefs(false)} />}
    </div>
  );
}

// ─── App Root com Rotas ──────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* Páginas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dashboard — seleção de workspace */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      {/* Board dinâmico */}
      <Route
        path="/board/:boardId"
        element={
          <PrivateRoute>
            <BoardPage />
          </PrivateRoute>
        }
      />

      {/* Compatibilidade com /board sem ID → redireciona para dashboard */}
      <Route path="/board" element={<Navigate to="/dashboard" replace />} />

      {/* Fallback → redireciona para dashboard (ou login via PrivateRoute) */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
