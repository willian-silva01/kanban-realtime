import { describe, it, expect, beforeEach, vi } from 'vitest';

const KEY = 'kanban_show_cursors';

const loadStore = async () => {
  vi.resetModules();
  return (await import('../../stores/presenceStore')).usePresenceStore;
};

describe('presenceStore.showCursors', () => {
  beforeEach(() => localStorage.clear());

  it('padrão é mostrar cursores', async () => {
    const store = await loadStore();
    expect(store.getState().showCursors).toBe(true);
  });

  it('toggle alterna e persiste no localStorage', async () => {
    const store = await loadStore();

    store.getState().toggleShowCursors();
    expect(store.getState().showCursors).toBe(false);
    expect(localStorage.getItem(KEY)).toBe('false');

    store.getState().toggleShowCursors();
    expect(store.getState().showCursors).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('true');
  });

  it('lê a preferência salva ao iniciar', async () => {
    localStorage.setItem(KEY, 'false');
    const store = await loadStore();
    expect(store.getState().showCursors).toBe(false);
  });

  it('reset de sessão preserva a preferência', async () => {
    const store = await loadStore();
    store.getState().toggleShowCursors();
    store.getState().reset();
    expect(store.getState().showCursors).toBe(false);
  });
});
