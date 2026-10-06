import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useWorkspaceStore = create(
  devtools(
    (set) => ({
      workspaces: [],
      currentWorkspace: null,
      workspaceBoards: [],
      isLoading: false,
      error: null,

      setWorkspaces: (workspaces) => set({ workspaces }),
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      setWorkspaceBoards: (boards) => set({ workspaceBoards: boards }),
      addWorkspace: (workspace) =>
        set((s) => ({ workspaces: [workspace, ...s.workspaces] })),
      addBoard: (board) =>
        set((s) => ({ workspaceBoards: [board, ...s.workspaceBoards] })),
      setIsLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () =>
        set({
          workspaces: [],
          currentWorkspace: null,
          workspaceBoards: [],
          isLoading: false,
          error: null,
        }),
    }),
    { name: 'WorkspaceStore', enabled: import.meta.env.DEV }
  )
);
