import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const SHOW_CURSORS_KEY = 'kanban_show_cursors';

const readShowCursors = () => {
  try {
    return localStorage.getItem(SHOW_CURSORS_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const usePresenceStore = create(
  devtools(
    (set) => ({
      socket: null,
      isConnected: false,
      isReconnecting: false,
      onlineUsers: [],
      showCursors: readShowCursors(),
      setSocket: (socket) => set({ socket }),
      setIsConnected: (isConnected) => set({ isConnected }),
      setIsReconnecting: (isReconnecting) => set({ isReconnecting }),
      setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
      toggleShowCursors: () =>
        set((s) => {
          const showCursors = !s.showCursors;
          try {
            localStorage.setItem(SHOW_CURSORS_KEY, String(showCursors));
          } catch {
            // sem storage (modo privado): vale só para a sessão
          }
          return { showCursors };
        }),
      // showCursors é preferência do usuário: sobrevive ao reset de sessão
      reset: () => set({ socket: null, isConnected: false, isReconnecting: false, onlineUsers: [] }),
    }),
    { name: 'PresenceStore', enabled: import.meta.env.DEV }
  )
);
