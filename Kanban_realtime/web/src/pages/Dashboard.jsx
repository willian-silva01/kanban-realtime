/**
 * Dashboard.jsx — Seleção de Workspace e Boards
 *
 * Layout:
 *   Sidebar: lista de workspaces + botão criar
 *   Content: boards do workspace selecionado + botão criar board
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspaceStore } from '../stores/workspaceStore';
import api from '../services/api';

// ─── Ícones SVG inline ────────────────────────────────────────────────────────
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const IconGrid = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const IconUsers = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconBoard = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="11" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Utilitário ───────────────────────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

// ─── Modal de criação ─────────────────────────────────────────────────────────
function CreateModal({ title, label, placeholder, onConfirm, onClose, isLoading }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) { setError(`${label} é obrigatório`); return; }
    if (trimmed.length > 100) { setError('Máximo 100 caracteres'); return; }
    onConfirm(trimmed);
  };

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <span style={S.modalTitle}>{title}</span>
          <button style={S.iconBtn} onClick={onClose}><IconClose /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={S.label}>{label}</label>
            <input
              autoFocus
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              placeholder={placeholder}
              style={{ ...S.input, ...(error ? S.inputError : {}) }}
              disabled={isLoading}
            />
            {error && <p style={S.fieldError}>{error}</p>}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" style={S.cancelBtn} onClick={onClose} disabled={isLoading}>
              Cancelar
            </button>
            <button type="submit" style={S.submitBtn} disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  // Zustand
  const workspaces = useWorkspaceStore((s) => s.workspaces);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceBoards = useWorkspaceStore((s) => s.workspaceBoards);
  const isLoading = useWorkspaceStore((s) => s.isLoading);
  const setWorkspaces = useWorkspaceStore((s) => s.setWorkspaces);
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const setWorkspaceBoards = useWorkspaceStore((s) => s.setWorkspaceBoards);
  const addWorkspace = useWorkspaceStore((s) => s.addWorkspace);
  const addBoard = useWorkspaceStore((s) => s.addBoard);
  const setIsLoading = useWorkspaceStore((s) => s.setIsLoading);

  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [creating, setCreating] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Carregar workspaces do usuário
  useEffect(() => {
    setIsLoading(true);
    api.get('/workspaces')
      .then((res) => {
        const list = res.data.data;
        setWorkspaces(list);
        if (!currentWorkspace && list.length > 0) {
          selectWorkspace(list[0]);
        }
      })
      .catch(() => setApiError('Não foi possível carregar os workspaces.'))
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectWorkspace = useCallback((ws) => {
    setCurrentWorkspace(ws);
    setWorkspaceBoards([]);
    api.get(`/workspaces/${ws.id}/boards`)
      .then((res) => setWorkspaceBoards(res.data.data))
      .catch(() => setWorkspaceBoards([]));
  }, [setCurrentWorkspace, setWorkspaceBoards]);

  const handleCreateWorkspace = async (name) => {
    setCreating(true);
    try {
      const res = await api.post('/workspaces', { name });
      const ws = res.data.data;
      addWorkspace(ws);
      setShowNewWorkspace(false);
      selectWorkspace(ws);
    } catch (err) {
      setApiError(err.response?.data?.error?.message || 'Erro ao criar workspace.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateBoard = async (name) => {
    if (!currentWorkspace) return;
    setCreating(true);
    try {
      const res = await api.post('/boards', { name, workspaceId: currentWorkspace.id });
      const board = res.data.data;
      addBoard(board);
      setShowNewBoard(false);
      navigate(`/board/${board.id}`);
    } catch (err) {
      setApiError(err.response?.data?.error?.message || 'Erro ao criar board.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={S.page}>
      {/* ── Header ───────────────────────────────────────────── */}
      <header style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="11" rx="2" fill="#A881FC" />
            <rect x="14" y="3" width="7" height="7" rx="2" fill="#6A38E3" />
            <rect x="14" y="14" width="7" height="7" rx="2" fill="#A881FC" opacity="0.7" />
          </svg>
          <span style={S.logoText}>Kanban Realtime</span>
        </div>

        <button
          onClick={logout}
          style={S.logoutBtn}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(227,56,77,0.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(227,56,77,0.1)')}
        >
          Sair
        </button>
      </header>

      {/* ── Conteúdo ─────────────────────────────────────────── */}
      <div style={S.body}>
        {/* ── Sidebar: Workspaces ───────────────────────────── */}
        <aside style={S.sidebar}>
          <div style={S.sidebarHeader}>
            <span style={S.sidebarTitle}>Workspaces</span>
            <button
              style={S.sidebarAddBtn}
              onClick={() => setShowNewWorkspace(true)}
              title="Criar workspace"
            >
              <IconPlus />
            </button>
          </div>

          {isLoading ? (
            <div style={S.loading}>Carregando...</div>
          ) : workspaces.length === 0 ? (
            <div style={S.empty}>
              <p style={S.emptyText}>Nenhum workspace ainda.</p>
              <button style={S.emptyBtn} onClick={() => setShowNewWorkspace(true)}>
                Criar o primeiro
              </button>
            </div>
          ) : (
            <ul style={S.wsList}>
              {workspaces.map((ws) => {
                const active = currentWorkspace?.id === ws.id;
                return (
                  <li
                    key={ws.id}
                    style={{ ...S.wsItem, ...(active ? S.wsItemActive : {}) }}
                    onClick={() => selectWorkspace(ws)}
                  >
                    <div style={S.wsAvatar}>
                      {initials(ws.name)}
                    </div>
                    <div style={S.wsInfo}>
                      <span style={S.wsName}>{ws.name}</span>
                      <div style={S.wsMeta}>
                        <IconUsers />
                        <span>{ws.members?.length ?? 0}</span>
                        <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
                        <IconBoard />
                        <span>{ws._count?.boards ?? 0}</span>
                      </div>
                    </div>
                    {active && <div style={S.activeIndicator}><IconChevron /></div>}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* ── Painel: Boards ────────────────────────────────── */}
        <main style={S.content}>
          {apiError && (
            <div style={S.errorBanner}>
              {apiError}
              <button style={S.errorDismiss} onClick={() => setApiError(null)}><IconClose /></button>
            </div>
          )}

          {!currentWorkspace ? (
            <div style={S.centerEmpty}>
              <div style={S.bigIcon}><IconGrid /></div>
              <p style={S.centerText}>Selecione ou crie um workspace para ver seus boards.</p>
            </div>
          ) : (
            <>
              <div style={S.contentHeader}>
                <div>
                  <h2 style={S.contentTitle}>{currentWorkspace.name}</h2>
                  <p style={S.contentSub}>
                    {currentWorkspace.members?.length ?? 0} membro(s) · {workspaceBoards.length} board(s)
                  </p>
                </div>
                <button
                  style={S.newBoardBtn}
                  onClick={() => setShowNewBoard(true)}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  <IconPlus /> Novo board
                </button>
              </div>

              {workspaceBoards.length === 0 ? (
                <div style={S.centerEmpty}>
                  <div style={S.bigIcon}><IconBoard /></div>
                  <p style={S.centerText}>Nenhum board neste workspace ainda.</p>
                  <button style={S.emptyBtn} onClick={() => setShowNewBoard(true)}>
                    Criar o primeiro board
                  </button>
                </div>
              ) : (
                <div style={S.boardGrid}>
                  {workspaceBoards.map((board) => (
                    <button
                      key={board.id}
                      style={S.boardCard}
                      onClick={() => navigate(`/board/${board.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(106,56,227,0.5)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={S.boardCardTop}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="7" height="11" rx="2" fill="#A881FC" opacity="0.8" />
                          <rect x="14" y="3" width="7" height="7" rx="2" fill="#6A38E3" opacity="0.8" />
                          <rect x="14" y="14" width="7" height="7" rx="2" fill="#A881FC" opacity="0.5" />
                        </svg>
                      </div>
                      <span style={S.boardName}>{board.name}</span>
                      <span style={S.boardMeta}>{board._count?.columns ?? 0} colunas</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Modais ───────────────────────────────────────────── */}
      {showNewWorkspace && (
        <CreateModal
          title="Novo Workspace"
          label="Nome do workspace"
          placeholder="Ex: Projeto Alpha, Equipe Marketing..."
          onConfirm={handleCreateWorkspace}
          onClose={() => setShowNewWorkspace(false)}
          isLoading={creating}
        />
      )}
      {showNewBoard && (
        <CreateModal
          title="Novo Board"
          label="Nome do board"
          placeholder="Ex: Sprint Q2, Backlog, Roadmap..."
          onConfirm={handleCreateBoard}
          onClose={() => setShowNewBoard(false)}
          isLoading={creating}
        />
      )}
    </div>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: '#0d0f14',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#F0F2F5',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    height: 56,
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(13,15,20,0.95)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  logoText: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#F0F2F5',
    letterSpacing: '-0.3px',
  },
  logoutBtn: {
    background: 'rgba(227,56,77,0.1)',
    border: '1px solid rgba(227,56,77,0.2)',
    color: '#E3384D',
    borderRadius: 8,
    padding: '6px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    fontFamily: 'inherit',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  // Sidebar
  sidebar: {
    width: 280,
    flexShrink: 0,
    borderRight: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(16,18,26,0.7)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 18px 12px',
  },
  sidebarTitle: {
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#8E9BAE',
  },
  sidebarAddBtn: {
    background: 'rgba(106,56,227,0.15)',
    border: '1px solid rgba(106,56,227,0.3)',
    color: '#A881FC',
    borderRadius: 6,
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  wsList: { listStyle: 'none', margin: 0, padding: '0 8px 16px', display: 'flex', flexDirection: 'column', gap: 2 },
  wsItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s',
    border: '1px solid transparent',
  },
  wsItemActive: {
    background: 'rgba(106,56,227,0.12)',
    border: '1px solid rgba(106,56,227,0.25)',
  },
  wsAvatar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #6A38E3, #A881FC)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#fff',
    flexShrink: 0,
  },
  wsInfo: { flex: 1, minWidth: 0 },
  wsName: {
    display: 'block',
    fontSize: '0.88rem',
    fontWeight: 600,
    color: '#E4E8F0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  wsMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: '0.72rem',
    color: '#8E9BAE',
    marginTop: 2,
  },
  activeIndicator: { color: '#A881FC', flexShrink: 0 },
  // Content
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px',
    display: 'flex',
    flexDirection: 'column',
  },
  contentHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  contentTitle: {
    fontSize: '1.35rem',
    fontWeight: 700,
    margin: '0 0 4px',
    color: '#F0F2F5',
  },
  contentSub: { fontSize: '0.8rem', color: '#8E9BAE', margin: 0 },
  newBoardBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    background: 'linear-gradient(135deg, #6A38E3 0%, #8A5CF7 100%)',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: '0.83rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.2s',
    boxShadow: '0 4px 14px rgba(106,56,227,0.4)',
  },
  // Board grid
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 16,
  },
  boardCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    background: 'rgba(22,25,33,0.8)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: '20px 18px',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, transform 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  boardCardTop: { marginBottom: 4 },
  boardName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#E4E8F0',
    lineHeight: 1.3,
  },
  boardMeta: { fontSize: '0.75rem', color: '#8E9BAE' },
  // Empty / loading states
  loading: { padding: '24px 18px', color: '#8E9BAE', fontSize: '0.85rem' },
  empty: { padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 12 },
  emptyText: { color: '#8E9BAE', fontSize: '0.85rem', margin: 0 },
  emptyBtn: {
    background: 'rgba(106,56,227,0.15)',
    border: '1px solid rgba(106,56,227,0.3)',
    color: '#A881FC',
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    width: 'fit-content',
  },
  centerEmpty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
    color: '#8E9BAE',
  },
  bigIcon: {
    width: 56,
    height: 56,
    background: 'rgba(106,56,227,0.12)',
    border: '1px solid rgba(106,56,227,0.2)',
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#A881FC',
  },
  centerText: { fontSize: '0.9rem', margin: 0, textAlign: 'center', maxWidth: 300 },
  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'rgba(22,25,33,0.98)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontSize: '1rem', fontWeight: 700, color: '#F0F2F5' },
  iconBtn: {
    background: 'none',
    border: 'none',
    color: '#8E9BAE',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 4,
    borderRadius: 6,
    fontFamily: 'inherit',
  },
  label: {
    display: 'block',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#C9D1D9',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: '#F0F2F5',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'inherit',
  },
  inputError: { borderColor: 'rgba(248,81,73,0.5)' },
  fieldError: { color: '#ff7b72', fontSize: '0.78rem', margin: '6px 0 0' },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#C9D1D9',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: '0.83rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #6A38E3 0%, #8A5CF7 100%)',
    border: 'none',
    color: '#fff',
    borderRadius: 8,
    padding: '8px 20px',
    fontSize: '0.83rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    boxShadow: '0 4px 14px rgba(106,56,227,0.4)',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'rgba(248,81,73,0.08)',
    border: '1px solid rgba(248,81,73,0.25)',
    borderRadius: 10,
    padding: '10px 14px',
    marginBottom: 20,
    color: '#ff7b72',
    fontSize: '0.85rem',
  },
  errorDismiss: {
    background: 'none',
    border: 'none',
    color: '#ff7b72',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    flexShrink: 0,
    fontFamily: 'inherit',
  },
};
