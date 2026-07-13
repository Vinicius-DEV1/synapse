import { invoke } from '@tauri-apps/api/core';

export const createTauriApi = async () => {
  let syncCallbacks: (() => void)[] = [];
  const triggerSync = () => syncCallbacks.forEach(cb => cb());

  return {
    onSyncTrigger: (callback: () => void) => {
      syncCallbacks.push(callback);
      return () => {
        syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
      };
    },

    // --- AUTH ---
    auth: {
      status: async () => {
        return await invoke('auth_status');
      },
      login: async (password: string) => {
        return await invoke('auth_login', { password });
      },
      setup: async (password: string, existingKeys?: any) => {
        return await invoke('auth_setup', { password, existingKeys });
      },
      changePassword: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
      onLock: () => () => {},
      lock: async () => {},
      setPreferences: async () => {}
    },

    // Mock das outras chamadas até que o Rust as implemente
    config: { get: async () => null, set: async () => ({ success: true }) },
    // --- PAGES ---
    getAllPages: async () => await invoke('notes_get_all_pages'),
    getPageContent: async (id: string) => await invoke('notes_get_page_content', { id }),
    createPage: async (page: any) => await invoke('notes_create_page', { page }),
    updatePage: async (page: any) => await invoke('notes_update_page', { page }),
    deletePage: async (id: string) => await invoke('notes_delete_page', { id }),
    reorderPages: async () => true, // TODO
    getPageHistory: async () => [],
    
    // --- IMAGE CACHE ---
    imageCache: {
      get: async (id: string) => await invoke('image_cache_get', { id }),
      put: async (id: string, data: ArrayBuffer, mimeType: string) => 
        await invoke('image_cache_put', { id, data: Array.from(new Uint8Array(data)), mimeType })
    },
    finance: { getTransactions: async () => [], getWishlist: async () => [] },
    culture: { getItems: async () => [], getRecentReleases: async () => [] },
    library: { getBooks: async () => [], getCollections: async () => [] },
    focus: { getSessions: async () => [], getAlarms: async () => [] },
    calendar: { getEvents: async () => [] }
  };
};
