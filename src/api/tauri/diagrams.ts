import { invoke } from '@tauri-apps/api/core';

export const tauriDiagramsApi = {
  getAll: async () => await invoke('diagrams_get_all'),
  getContent: async (id: string) => await invoke('diagrams_get_content', { id }),
  create: async (payload: { title?: string; icon?: string }) => await invoke('diagrams_create', { payload }),
  update: async (payload: { id: string; title?: string; icon?: string; content?: string }) => await invoke('diagrams_update', { payload }),
  delete: async (id: string) => await invoke('diagrams_delete', { id })
};
