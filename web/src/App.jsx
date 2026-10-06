/**
 * App.jsx — Roteamento principal da aplicação
 *
 * Estrutura:
 *   /login        → tela de login (pública)
 *   /register     → tela de cadastro (pública)
 *   /dashboard    → seleção de workspace e boards (PROTEGIDO)
 *   /board/:id    → board principal (PROTEGIDO)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import Board from './components/Board/Board';
import ActivityPanel from './components/ActivityPanel/ActivityPanel';
import EmailPreferences from './components/EmailPreferences/EmailPreferences';
import BoardHeader from './components/BoardHeader/BoardHeader';

import { useAuthStore } from './stores/authStore';
import { usePresenceStore } from './stores/presenceStore';
import { useBoardStore } from './stores/boardStore';
import './index.css';

// ─── Tela de Board (área protegida) ─────────────────────────────────────────
function BoardPage() {
  const { boardId } = useParams();
  const socket = usePresenceStore((s) => s.socket);
  const setOnlineUsers = usePresenceStore((s) => s.setOnlineUsers);
  const user = useAuthStore((s) => s.user);
  const boardError = useBoardStore((s) => s.boardError);
  const setBoardError = useBoardStore((s) => s.setBoardError);
  const [showEmailPrefs, setShowEmailPrefs] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const closeActivity = useCallback(() => setShowActivity(false), []);

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
      <BoardHeader
        boardId={boardId}
        activityOpen={showActivity}
        onToggleActivity={() => setShowActivity((v) => !v)}
        onOpenEmailPrefs={() => setShowEmailPrefs(true)}
      />

      {/* ─── Activity Panel ──────────────────────────────────── */}
      <ActivityPanel
        socket={socket}
        boardId={boardId}
        isOpen={showActivity}
        onClose={closeActivity}
      />

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
