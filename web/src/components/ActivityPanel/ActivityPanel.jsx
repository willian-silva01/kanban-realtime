import { useEffect, useState } from 'react';
import { Activity, Archive, ArrowRightLeft, CheckSquare, Clock, MessageSquare, Plus, UserPlus, X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useBoardStore } from '../../stores/boardStore';
import { timeAgo } from '../../utils/timeAgo';
import './ActivityPanel.css';

const quoted = (text) => (text ? `"${text}"` : 'um card');

// Ícone, cor e texto por tipo de atividade (ActivityLog.action no backend).
const ACTIVITY_TYPES = {
  CARD_MOVED: {
    icon: ArrowRightLeft,
    color: '#3B82F6',
    text: (m, columnName) =>
      columnName ? `moveu ${quoted(m?.cardTitle)} para "${columnName}"` : `moveu ${quoted(m?.cardTitle)} de coluna`,
  },
  CARD_CREATED: { icon: Plus, color: '#22C55E', text: (m) => `criou o card ${quoted(m?.cardTitle)}` },
  COMMENT_CREATED: { icon: MessageSquare, color: '#A855F7', text: (m) => `comentou em ${quoted(m?.cardTitle)}` },
  CARD_ASSIGNEE_ADDED: {
    icon: UserPlus,
    color: '#F59E0B',
    text: (m) => (m?.assigneeName ? `atribuiu ${m.assigneeName} a um card` : 'atribuiu um responsável a um card'),
  },
  CHECKLIST_ITEM_TOGGLED: {
    icon: CheckSquare,
    color: '#14B8A6',
    text: (m) => `${m?.completed ? 'completou' : 'desmarcou'} um item de checklist`,
  },
  CARD_ARCHIVED: { icon: Archive, color: '#F97316', text: () => 'arquivou um card' },
};

const FALLBACK_TYPE = { icon: Activity, color: '#8E9BAE', text: () => 'atualizou o board' };

const REFRESH_MS = 60 * 1000; // atualiza "há N min" enquanto o painel está aberto

export default function ActivityPanel({ socket, boardId, isOpen, onClose }) {
  const { isAuthenticated } = useAuth();
  const columns = useBoardStore((s) => s.columns);
  const [activities, setActivities] = useState([]);
  const [, setTick] = useState(0);

  // Histórico via REST (carregado mesmo fechado, para abrir instantâneo)
  useEffect(() => {
    if (!boardId || !isAuthenticated) return;

    api
      .get(`/boards/${boardId}/activities`)
      .then((res) => res.data)
      .then((res) => {
        // GET /boards/:id/activities → { success, data: Activity[], pagination }
        if (res.success && Array.isArray(res.data)) {
          setActivities(
            res.data.map((a) => ({
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
        if (err.response?.status !== 401) {
          console.error('[ActivityPanel] Erro ao carregar atividades:', err.message);
        }
      });
  }, [boardId, isAuthenticated]);

  // Novas atividades em tempo real
  useEffect(() => {
    if (!socket) return;

    const handleNewActivity = (payload) => {
      const newAct = { ...payload, id: payload.id || payload.createdAt || Date.now().toString() };
      setActivities((prev) => [newAct, ...prev]);
    };

    socket.on('activity:new', handleNewActivity);
    return () => socket.off('activity:new', handleNewActivity);
  }, [socket]);

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    const onKeyDown = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearInterval(id);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Atividades antigas não têm toColumnName — cai no nome atual da coluna
  const columnName = (m) => m?.toColumnName ?? columns.find((c) => c.id === m?.toColumnId)?.name;

  return (
    <aside className="activity-panel" aria-label="Atividades do board">
      <div className="activity-panel__header">
        <h3>
          <Activity size={18} /> Atividades
        </h3>
        <button type="button" className="activity-panel__close" onClick={onClose} title="Fechar (Esc)">
          <X size={18} />
        </button>
      </div>

      <ul className="activity-panel__list">
        {activities.map((act) => {
          const type = ACTIVITY_TYPES[act.type] ?? FALLBACK_TYPE;
          const Icon = type.icon;
          return (
            <li key={act.id} className="activity-item">
              <span className="activity-item__icon" style={{ color: type.color, background: `${type.color}1F` }}>
                <Icon size={14} />
              </span>
              <div className="activity-item__body">
                <p className="activity-item__text">
                  <b>{act.user?.name ?? 'Alguém'}</b> {type.text(act.metadata, columnName(act.metadata))}
                </p>
                <time
                  className="activity-item__time"
                  dateTime={act.createdAt}
                  title={new Date(act.createdAt).toLocaleString('pt-BR')}
                >
                  <Clock size={10} /> {timeAgo(act.createdAt)}
                </time>
              </div>
            </li>
          );
        })}
      </ul>
      {activities.length === 0 && <p className="activity-panel__empty">Nenhuma atividade recente.</p>}
    </aside>
  );
}
