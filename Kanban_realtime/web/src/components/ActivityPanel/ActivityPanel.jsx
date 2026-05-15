import React, { useState, useEffect } from 'react';
import './ActivityPanel.css';
import { Activity, Clock } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// CORRIGIDO: componente não recebe mais prop `token` — usa o interceptor global
// do api.js que já injeta o header Authorization automaticamente.
// A prop `token` era passada como `undefined` em App.jsx, causando que o guard
// `if (!boardId || !token) return;` abortasse a requisição silenciosamente.
export default function ActivityPanel({ socket, boardId }) {
  const { isAuthenticated } = useAuth();
  const [activities, setActivities] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  // ─── Carregar histórico via REST ────────────────────────────────────────
  // Guard correto: boardId presente e usuário autenticado (token existe no localStorage)
  useEffect(() => {
    if (!boardId || !isAuthenticated) return;

    api
      .get(`/boards/${boardId}/activities`)
      .then((res) => res.data)
      .then((res) => {
        if (res.success && res.data?.activities) {
          setActivities(
            res.data.activities.map((a) => ({
              id: a.id,
              type: a.action,
              user: a.user,
              metadata: a.metadata,
              createdAt: a.createdAt,
            }))
          );
        }
      })
      .catch((err) => {
        // 401 já é tratado globalmente pelo interceptor (auth:logout)
        // Outros erros: apenas silencia (não quebra a UI)
        if (err.response?.status !== 401) {
          console.error('[ActivityPanel] Erro ao carregar atividades:', err.message);
        }
      });
  }, [boardId, isAuthenticated]);

  // ─── Escutar eventos WebSocket ───────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewActivity = (payload) => {
      const newAct = { ...payload, id: payload.id || payload.createdAt || Date.now().toString() };
      setActivities((prev) => [newAct, ...prev]);
    };

    socket.on('activity:create', handleNewActivity);
    return () => socket.off('activity:create', handleNewActivity);
  }, [socket]);

  // ─── Renderiza o texto da atividade ─────────────────────────────────────
  const renderText = (act) => {
    switch (act.type) {
      case 'CARD_MOVED':
        return (
          <span>
            <b>{act.user?.name}</b> moveu "{act.metadata?.cardTitle}" de coluna.
          </span>
        );
      case 'CARD_CREATED':
        return (
          <span>
            <b>{act.user?.name}</b> criou o card "{act.metadata?.cardTitle}".
          </span>
        );
      case 'COLUMN_CREATED':
        return (
          <span>
            <b>{act.user?.name}</b> criou a coluna.
          </span>
        );
      default:
        return (
          <span>
            <b>{act.user?.name}</b> executou ação: {act.type}
          </span>
        );
    }
  };

  return (
    <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', zIndex: 10 }}>
      {/* Botão de abrir painel */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'absolute',
            right: 20,
            top: 80,
            padding: 12,
            borderRadius: 8,
            background: 'var(--brand)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <Activity size={18} /> Atividades
        </button>
      )}

      {/* Painel lateral */}
      {isOpen && (
        <div
          style={{
            width: 320,
            height: '100%',
            background: 'var(--board-bg)',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Activity size={18} /> Activity
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              ✖
            </button>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activities.map((act) => (
              <div
                key={act.id}
                style={{
                  background: 'var(--card-bg)',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--brand)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {act.user?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, lineHeight: 1.4 }}>
                    {renderText(act)}
                    <div
                      style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.7rem',
                        marginTop: 4,
                        display: 'flex',
                        gap: 4,
                        alignItems: 'center',
                      }}
                    >
                      <Clock size={10} /> {new Date(act.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p style={{ color: 'gray', fontSize: '0.8rem' }}>Nenhuma atividade recente.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
