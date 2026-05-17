import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationStore } from '../../stores/notificationStore';
import './NotificationBell.css';

export default function NotificationBell({ socket }) {
  const { isAuthenticated } = useAuth();
  const { notifications, setNotifications, addNotification, markAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ─── 1. Carregar via REST ao montar ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    api
      .get('/notifications')
      .then((res) => res.data)
      .then((data) => {
        if (data.success && data.data) {
          setNotifications(data.data);
        }
      })
      .catch((err) => {
        if (err.response?.status !== 401) {
          console.error('[NotificationBell] Erro ao carregar notificações:', err.message);
        }
      });
  }, [isAuthenticated, setNotifications]);

  // ─── 2. Ouvir notificações em tempo real via WebSocket ────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('notification:new', addNotification);
    return () => socket.off('notification:new', addNotification);
  }, [socket, addNotification]);

  // Fechar dropdown se clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('[data-notification-bell]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div style={{ position: 'relative' }} data-notification-bell>
      {/* Sino */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        style={{
          background: 'none',
          border: 'none',
          color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          padding: '4px',
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#E3384D',
              color: '#fff',
              fontSize: '0.6rem',
              padding: '2px 5px',
              borderRadius: '10px',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 34,
            right: 0,
            width: 320,
            background: 'var(--board-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: 8,
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-faint)',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>Notificações</span>
            {unreadCount > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
              </span>
            )}
          </div>

          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            {notifications.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                Sem notificações
              </div>
            )}
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                style={{
                  padding: 12,
                  borderBottom: '1px solid var(--border-faint)',
                  cursor: notif.read ? 'default' : 'pointer',
                  background: notif.read ? 'transparent' : 'rgba(106, 56, 227, 0.1)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  transition: 'background 0.15s',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: notif.read ? 'transparent' : '#6A38E3',
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', color: notif.read ? 'var(--text-secondary)' : 'var(--text-primary)', lineHeight: 1.4 }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {new Date(notif.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
