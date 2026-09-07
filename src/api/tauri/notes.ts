import { invoke } from '@tauri-apps/api/core';

export const tauriNotesApi = {
  getAllPages: async () => await invoke('notes_get_all_pages'),
  getPageContent: async (id: string) => await invoke('notes_get_page_content', { id }),
  createPage: async (page: any) => await invoke('notes_create_page', { page }),
  updatePage: async (page: any) => await invoke('notes_update_page', { page }),
  deletePage: async (id: string) => await invoke('notes_delete_page', { id }),
  getDeletedPages: async () => await invoke('notes_get_deleted_pages'),
  restorePage: async (id: string) => await invoke('notes_restore_page', { id }),
  reorderPages: async () => true, // TODO
  getPageHistory: async (pageId: string) => await invoke('notes_get_page_history', { pageId }),
  savePageHistory: async (pageId: string, content: string) => {
    await invoke('notes_update_page', { page: { id: pageId, content } });
    return { success: true, id: pageId };
  },
  
  imageCache: {
    get: async (id: string) => await invoke('image_cache_get', { id }),
    put: async (id: string, data: ArrayBuffer, mimeType: string) => 
      await invoke('image_cache_put', { id, data: Array.from(new Uint8Array(data)), mimeType }),
    delete: async (id: string) => await invoke('image_cache_delete', { id }),
    cleanupOrphans: async () => await invoke('notes_cleanup_orphaned_images'),
  },
};
