import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useBoardStore = create(
  devtools(
    (set) => ({
      columns: [],
      cards: [],
      boardLabels: [],
      boardMembers: [],
      boardSynced: false,
      pendingCardIds: new Set(),
      boardError: null,
      activeCard: null,
      activeLabelFilter: null,
      myCardsFilter: false,
      sortByDueDate: false,

      // Board sync
      setBoardSync: ({ columns, cards, boardLabels, boardMembers }) =>
        set({
          columns,
          cards,
          boardLabels: boardLabels ?? [],
          boardMembers: boardMembers ?? [],
          boardSynced: true,
          pendingCardIds: new Set(),
        }),

      setBoardError: (boardError) => set({ boardError }),
      setActiveCard: (activeCard) => set({ activeCard }),

      // Filters
      toggleLabelFilter: (labelId) =>
        set((s) => ({ activeLabelFilter: s.activeLabelFilter === labelId ? null : labelId })),
      clearActiveLabelFilter: () => set({ activeLabelFilter: null }),
      toggleMyCardsFilter: () => set((s) => ({ myCardsFilter: !s.myCardsFilter })),
      toggleSortByDueDate: () => set((s) => ({ sortByDueDate: !s.sortByDueDate })),

      // Cards — supports functional updaters for DnD handlers
      setCards: (updaterOrCards) =>
        set((s) => ({
          cards:
            typeof updaterOrCards === 'function' ? updaterOrCards(s.cards) : updaterOrCards,
        })),
      addPendingCard: (cardId) =>
        set((s) => ({ pendingCardIds: new Set([...s.pendingCardIds, cardId]) })),

      // WebSocket event handlers
      moveCard: ({ card, toColumnId }) =>
        set((s) => {
          const filtered = s.cards.filter((c) => c.id !== card.id);
          filtered.splice(card.position, 0, { ...card, columnId: toColumnId });
          return {
            cards: filtered.map((c, idx) =>
              c.columnId === toColumnId ? { ...c, position: idx } : c
            ),
          };
        }),

      addLabelToCard: (cardId, label) =>
        set((s) => ({
          cards: s.cards.map((c) => {
            if (c.id !== cardId) return c;
            const already = c.labels?.some((l) => l.id === label.id);
            return already ? c : { ...c, labels: [...(c.labels ?? []), label] };
          }),
        })),

      removeLabelFromCard: (cardId, labelId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? { ...c, labels: (c.labels ?? []).filter((l) => l.id !== labelId) }
              : c
          ),
        })),

      updateCardDueDate: (cardId, dueDate) =>
        set((s) => ({
          cards: s.cards.map((c) => (c.id === cardId ? { ...c, dueDate } : c)),
        })),

      addAssigneeToCard: (cardId, assignee) =>
        set((s) => ({
          cards: s.cards.map((c) => {
            if (c.id !== cardId) return c;
            const already = c.assignees?.some((a) => a.id === assignee.id);
            return already ? c : { ...c, assignees: [...(c.assignees ?? []), assignee] };
          }),
        })),

      removeAssigneeFromCard: (cardId, userId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? { ...c, assignees: (c.assignees ?? []).filter((a) => a.id !== userId) }
              : c
          ),
        })),

      // Board labels
      addBoardLabel: (label) => set((s) => ({ boardLabels: [...s.boardLabels, label] })),
      updateBoardLabel: (label) =>
        set((s) => ({ boardLabels: s.boardLabels.map((l) => (l.id === label.id ? label : l)) })),
      deleteBoardLabel: (labelId) =>
        set((s) => ({
          boardLabels: s.boardLabels.filter((l) => l.id !== labelId),
          cards: s.cards.map((c) => ({
            ...c,
            labels: (c.labels ?? []).filter((l) => l.id !== labelId),
          })),
          activeLabelFilter: s.activeLabelFilter === labelId ? null : s.activeLabelFilter,
        })),

      reset: () =>
        set({
          columns: [],
          cards: [],
          boardLabels: [],
          boardMembers: [],
          boardSynced: false,
          pendingCardIds: new Set(),
          boardError: null,
          activeCard: null,
          activeLabelFilter: null,
          myCardsFilter: false,
          sortByDueDate: false,
        }),
    }),
    { name: 'BoardStore', enabled: import.meta.env.DEV }
  )
);
