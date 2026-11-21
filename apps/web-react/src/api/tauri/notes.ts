import { invoke } from '@tauri-apps/api/core';
import type { Page } from '../../types';

export const tauriNotesApi = {
  getAllPages: async () => await invoke('notes_get_all_pages'),
  getPageContent: async (id: string) => await invoke('notes_get_page_content', { id }),
  createPage: async (page: Partial<Page>) => await invoke('notes_create_page', { page }),
  updatePage: async (page: Partial<Page>) => await invoke('notes_update_page', { page }),
  deletePage: async (id: string) => await invoke('notes_delete_page', { id }),
  deletePages: async (ids: string[]): Promise<boolean> => await invoke('notes_delete_pages', { ids }),
  getDeletedPages: async () => await invoke('notes_get_deleted_pages'),
  restorePage: async (id: string) => await invoke('notes_restore_page', { id }),
  reorderPages: async (updates: { id: string; sort_order: number }[]): Promise<boolean> =>
    await invoke<boolean>('notes_reorder_pages', { updates }),
  getPageHistory: async (pageId: string) => await invoke('notes_get_page_history', { pageId }),
  savePageHistory: async (pageId: string, content: string) => {
    await invoke('notes_update_page', { page: { id: pageId, content } });
    return { success: true, id: pageId };
  },
  
  imageCache: {
    get: async (id: string) => await invoke('image_cache_get', { id }),
    put: async (id: string, data: ArrayBuffer, mimeType: string) => 
      await invoke('image_cache_put', { id, data: new Uint8Array(data), mimeType }),
    delete: async (id: string) => await invoke('image_cache_delete', { id }),
    cleanupOrphans: async () => await invoke('notes_cleanup_orphaned_images'),
  },
};
