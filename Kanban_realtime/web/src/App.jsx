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

import { useAuth } from './contexts/AuthContext';
import './index.css';

// ─── Constante do Board ──────────────────────────────────────────────────────
// TODO: Substituir por seleção dinâmica do board (lista de boards do usuário)
const BOARD_ID = 'board-demo';

// ─── Tela de Board (área protegida) ─────────────────────────────────────────
function BoardPage() {
  const { socket, user, isConnected, isReconnecting, logout } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Entra no board e anuncia presença ao conectar (ou reconectar)
  useEffect(() => {
    if (!socket) return;

    const joinBoard = () => {
      // CORRIGIDO (BUG-05): passa callback para detectar falha ao entrar na room.
      // Sem callback, uma falha de _checkAccess no servidor era silenciosa:
      // o socket nunca entrava na room e nenhum broadcast chegava.
      socket.emit('board:join', { boardId: BOARD_ID }, (response) => {
        if (response && !response.success) {
          console.error('[BoardPage] Falha ao entrar no board:', response.message);
          // TODO: exibir erro para o usuário (toast, redirect, etc)
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: isConnected ? '#10B981' : isReconnecting ? '#F59E0B' : '#EF4444',
              boxShadow: isConnected ? '0 0 6px #10B981' : isReconnecting ? '0 0 6px #F59E0B' : 'none',
              transition: 'all 0.3s',
              animation: isReconnecting ? 'pulse 1.2s ease-in-out infinite' : 'none',
            }} />
            {isConnected ? 'Sincronizado' : isReconnecting ? 'Reconectando...' : 'Offline'}
          </div>

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
      <Board socket={socket} boardId={BOARD_ID} user={user} />
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
