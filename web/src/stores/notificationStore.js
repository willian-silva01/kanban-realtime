import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import api from '../services/api';

export const useNotificationStore = create(
  devtools(
    (set) => ({
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      addNotification: (notif) =>
        set((s) => ({ notifications: [notif, ...s.notifications] })),
      markAsRead: async (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
        try {
          await api.patch(`/notifications/${id}/read`);
        } catch (err) {
          set((s) => ({
            notifications: s.notifications.map((n) =>
              n.id === id ? { ...n, read: false } : n
            ),
          }));
          if (err.response?.status !== 401) {
            console.error('[NotificationStore] Erro ao marcar notificação:', err.message);
          }
        }
      },
      reset: () => set({ notifications: [] }),
    }),
    { name: 'NotificationStore', enabled: import.meta.env.DEV }
  )
);
