import { describe, it, expect, vi } from 'vitest';
import { createTauriApi } from './tauri-api';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd: string, args: any) => {
    if (cmd === 'notes_get_all_pages') return Promise.resolve([{ id: 'p1', title: 'Test Page' }]);
    if (cmd === 'sync_get_table') return Promise.resolve([]);
    if (cmd === 'notes_create_page') return Promise.resolve({ id: 'p-new', ...args?.page });
    return Promise.resolve({ success: true });
  }),
}));

describe('tauri-api bridge (Desktop Native IPC)', () => {
  it('creates Tauri API client with all domain sub-APIs', async () => {
    const api = await createTauriApi();

    expect(api.auth).toBeDefined();
    expect(api.finance).toBeDefined();
    expect(api.library).toBeDefined();
    expect(api.calendar).toBeDefined();
    expect(api.focus).toBeDefined();
    expect(api.anki).toBeDefined();
    expect(api.vault).toBeDefined();
    expect(api.trash).toBeDefined();
    expect(api.video).toBeDefined();
  });

  it('calls invoke for page operations', async () => {
    const api = await createTauriApi();

    const pages = await api.getAllPages();
    expect(pages).toEqual([{ id: 'p1', title: 'Test Page' }]);

    const newPage = await api.createPage({ title: 'Brand New' });
    expect(newPage).toEqual({ id: 'p-new', title: 'Brand New' });
  });

  it('registers and unregisters sync trigger listeners', async () => {
    const api = await createTauriApi();
    const callback = vi.fn();

    const unsubscribe = api.onSyncTrigger(callback);
    window.dispatchEvent(new CustomEvent('app-sync-trigger'));

    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(new CustomEvent('app-sync-trigger'));
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
