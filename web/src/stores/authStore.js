import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useAuthStore = create(
  devtools(
    (set) => ({
      user: null,
      token: null,
      authLoading: true,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setAuthLoading: (authLoading) => set({ authLoading }),
      reset: () => set({ user: null, token: null, authLoading: true }),
    }),
    { name: 'AuthStore', enabled: import.meta.env.DEV }
  )
);
