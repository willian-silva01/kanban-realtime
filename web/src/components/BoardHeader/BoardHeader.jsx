import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Moon, Settings, Sun } from 'lucide-react';
import BoardTitle from '../BoardTitle/BoardTitle';
import ConnectionStatus from '../ConnectionStatus/ConnectionStatus';
import NotificationBell from '../NotificationBell/NotificationBell';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthStore } from '../../stores/authStore';
import { usePresenceStore } from '../../stores/presenceStore';
import { useThemeStore } from '../../stores/themeStore';
import './BoardHeader.css';

const MAX_VISIBLE_ONLINE = 3;

const initial = (name) => name?.charAt(0).toUpperCase() || '?';

function OnlineUsers({ users }) {
  if (users.length === 0) return null;

  const visible = users.slice(0, MAX_VISIBLE_ONLINE);
  const hidden = users.slice(MAX_VISIBLE_ONLINE);

  return (
    <div className="header-online">
      <span className="header-online-label">Online ({users.length})</span>
      <div className="header-online-avatars">
        {visible.map((u) => (
          <div key={u.userId} className="header-online-avatar" title={u.name}>
            {initial(u.name)}
          </div>
        ))}
        {hidden.length > 0 && (
          <div className="header-online-more" title={hidden.map((u) => u.name).join(', ')}>
            +{hidden.length}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Header da board page:
 * [← Boards] [Marca] [Nome do board]   [Online] | [Conexão] | [Atividades] [🔔] [Tema] [⚙] | [Avatar] [Sair]
 */
export default function BoardHeader({ boardId, activityOpen, onToggleActivity, onOpenEmailPrefs }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);
  const socket = usePresenceStore((s) => s.socket);
  const isConnected = usePresenceStore((s) => s.isConnected);
  const isReconnecting = usePresenceStore((s) => s.isReconnecting);
  const onlineUsers = usePresenceStore((s) => s.onlineUsers);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <header className="header">
      <div className="header-left">
        <button
          type="button"
          className="header-back-btn"
          onClick={() => navigate('/dashboard')}
          title="Voltar aos boards"
        >
          <ArrowLeft size={16} />
          <span>Boards</span>
        </button>
        <h1>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="7" height="11" rx="2" fill="#A881FC" />
            <rect x="14" y="3" width="7" height="7" rx="2" fill="#6A38E3" />
            <rect x="14" y="14" width="7" height="7" rx="2" fill="#A881FC" opacity="0.7" />
          </svg>
          Kanban Realtime
        </h1>
        <BoardTitle boardId={boardId} />
      </div>

      <div className="header-right">
        <OnlineUsers users={onlineUsers} />
        {onlineUsers.length > 0 && <span className="header-sep" />}

        <ConnectionStatus isConnected={isConnected} isReconnecting={isReconnecting} />
        <span className="header-sep" />

        <button
          type="button"
          className={`icon-btn${activityOpen ? ' header-btn--active' : ''}`}
          onClick={onToggleActivity}
          aria-pressed={activityOpen}
          title={activityOpen ? 'Fechar atividades' : 'Atividades do board'}
        >
          <Activity size={16} />
          <span className="header-btn-label">Atividades</span>
        </button>
        <NotificationBell socket={socket} />
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          type="button"
          className="icon-btn header-email-pref"
          onClick={onOpenEmailPrefs}
          title="Preferências de notificação por e-mail"
        >
          <Settings size={16} />
        </button>
        <span className="header-sep" />

        <div className="header-user">
          <div className="header-avatar" title={user?.name}>
            {initial(user?.name)}
          </div>
          <button id="logout-btn" type="button" className="header-logout-btn" onClick={logout} title="Sair">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
