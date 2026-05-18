import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useBoardStore = create(
  devtools(
    (set) => ({
      boardName: '',
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
      searchQuery: '',
      focusedCardId: null,
      escapeSeq: 0,
      openCommentsPanelSeq: { cardId: null, seq: 0 },

      // Board sync
      setBoardSync: ({ boardName, columns, cards, boardLabels, boardMembers }) =>
        set({
          boardName: boardName ?? '',
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
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      clearAllFilters: () =>
        set({ activeLabelFilter: null, myCardsFilter: false, searchQuery: '' }),
      setFocusedCard: (id) => set({ focusedCardId: id }),
      incrementEscapeSeq: () => set((s) => ({ escapeSeq: s.escapeSeq + 1 })),
      triggerCommentsPanel: (cardId) =>
        set((s) => ({ openCommentsPanelSeq: { cardId, seq: s.openCommentsPanelSeq.seq + 1 } })),

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

      updateCardDescription: (cardId, description) =>
        set((s) => ({
          cards: s.cards.map((c) => (c.id === cardId ? { ...c, description } : c)),
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

      // Checklists
      addChecklist: (cardId, checklist) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? { ...c, checklists: [...(c.checklists ?? []), checklist] }
              : c
          ),
        })),

      updateChecklist: (cardId, checklistId, updates) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  checklists: (c.checklists ?? []).map((cl) =>
                    cl.id === checklistId ? { ...cl, ...updates } : cl
                  ),
                }
              : c
          ),
        })),

      deleteChecklist: (cardId, checklistId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? { ...c, checklists: (c.checklists ?? []).filter((cl) => cl.id !== checklistId) }
              : c
          ),
        })),

      addChecklistItem: (cardId, checklistId, item) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  checklists: (c.checklists ?? []).map((cl) =>
                    cl.id === checklistId
                      ? { ...cl, items: [...(cl.items ?? []), item] }
                      : cl
                  ),
                }
              : c
          ),
        })),

      updateChecklistItem: (cardId, checklistId, itemId, updates) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  checklists: (c.checklists ?? []).map((cl) =>
                    cl.id === checklistId
                      ? {
                          ...cl,
                          items: (cl.items ?? []).map((item) =>
                            item.id === itemId ? { ...item, ...updates } : item
                          ),
                        }
                      : cl
                  ),
                }
              : c
          ),
        })),

      deleteChecklistItem: (cardId, checklistId, itemId) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  checklists: (c.checklists ?? []).map((cl) =>
                    cl.id === checklistId
                      ? { ...cl, items: (cl.items ?? []).filter((item) => item.id !== itemId) }
                      : cl
                  ),
                }
              : c
          ),
        })),

      reorderChecklistItems: (cardId, checklistId, items) =>
        set((s) => ({
          cards: s.cards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  checklists: (c.checklists ?? []).map((cl) =>
                    cl.id === checklistId ? { ...cl, items } : cl
                  ),
                }
              : c
          ),
        })),

      // Archive
      archiveCard: (cardId) =>
        set((s) => ({ cards: s.cards.filter((c) => c.id !== cardId) })),

      unarchiveCard: (card) =>
        set((s) => ({ cards: [...s.cards, card] })),

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
          boardName: '',
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
          searchQuery: '',
          focusedCardId: null,
          escapeSeq: 0,
          openCommentsPanelSeq: { cardId: null, seq: 0 },
        }),
    }),
    { name: 'BoardStore', enabled: import.meta.env.DEV }
  )
);
