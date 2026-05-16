/**
 * App.jsx — Roteamento principal da aplicação
 *
 * Estrutura:
 *   /             → redireciona para /login
 *   /login        → tela de login (pública)
 *   /register     → tela de cadastro (pública)
 *   /board        → board principal (PROTEGIDO — requer JWT)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute/PrivateRoute';
import Board from './components/Board/Board';
import ActivityPanel from './components/ActivityPanel/ActivityPanel';
import NotificationBell from './components/NotificationBell/NotificationBell';
import ConnectionStatus from './components/ConnectionStatus/ConnectionStatus';

import { useAuth } from './contexts/AuthContext';
import './index.css';

// ─── Constante do Board ──────────────────────────────────────────────────────
// TODO: Substituir por seleção dinâmica do board (lista de boards do usuário)
const BOARD_ID = 'board-demo';

// ─── Tela de Board (área protegida) ─────────────────────────────────────────
function BoardPage() {
  const { socket, user, isConnected, isReconnecting, logout } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [boardError, setBoardError] = useState(null);

  // Entra no board e anuncia presença ao conectar (ou reconectar)
  useEffect(() => {
    if (!socket) return;

    const joinBoard = () => {
      setBoardError(null);
      socket.emit('board:join', { boardId: BOARD_ID }, (response) => {
        if (response && !response.success) {
          setBoardError(response.message || 'Não foi possível entrar no board.');
        }
      });

      socket.emit('presence:join', { boardId: BOARD_ID, name: user?.name || 'Anônimo' });
    };

    // Handler nomeado para poder remover corretamente no cleanup
    const onPresenceUpdate = (users) => setOnlineUsers(users);

    // Caso o socket já esteja conectado quando o effect rodar (ex: reconexão rápida)
    if (socket.connected) {
      joinBoard();
    }

    socket.on('connect', joinBoard);
    socket.on('presence:update', onPresenceUpdate);

    return () => {
      // CORRIGIDO (BUG-03/04): passa referência nomeada para socket.off()
      socket.off('connect', joinBoard);
      socket.off('presence:update', onPresenceUpdate);

      // presence:leave é emitido se o socket ainda estiver ativo.
      // O board.handler.js também limpa via 'disconnect' event usando socket.currentBoardId.
      if (socket.connected) {
        socket.emit('presence:leave', { boardId: BOARD_ID });
      }
    };
  }, [socket, user]);

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Usuários Online */}
          {onlineUsers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
      <ActivityPanel socket={socket} boardId={BOARD_ID} />

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
            onClick={() => socket?.connected && socket.emit('board:join', { boardId: BOARD_ID }, (res) => {
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
        <Board socket={socket} boardId={BOARD_ID} user={user} />
      )}
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

      {/* Página Protegida */}
      <Route
        path="/board"
        element={
          <PrivateRoute>
            <BoardPage />
          </PrivateRoute>
        }
      />

      {/* Fallback → redireciona para Login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
