import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const usePresenceStore = create(
  devtools(
    (set) => ({
      socket: null,
      isConnected: false,
      isReconnecting: false,
      onlineUsers: [],
      setSocket: (socket) => set({ socket }),
      setIsConnected: (isConnected) => set({ isConnected }),
      setIsReconnecting: (isReconnecting) => set({ isReconnecting }),
      setOnlineUsers: (onlineUsers) => set({ onlineUsers }),
      reset: () => set({ socket: null, isConnected: false, isReconnecting: false, onlineUsers: [] }),
    }),
    { name: 'PresenceStore', enabled: import.meta.env.DEV }
  )
);
