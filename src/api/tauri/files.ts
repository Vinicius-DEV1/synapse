import { invoke } from '@tauri-apps/api/core';

export const tauriFilesApi = {
  getAll: async () => await invoke('files_get_all'),
  getById: async (id: string) => await invoke('files_get_by_id', { id }),
  create: async (file: any) => await invoke('files_create', { file }),
  update: async (id: string, file: any) => await invoke('files_update', { id, file }),
  delete: async (id: string) => await invoke('files_delete', { id }),
  move: async (id: string, folderId: string | null) => await invoke('files_move', { id, folderId }),
  saveLocal: async (filename: string, data: Uint8Array) => await invoke('files_save_local', { filename, data: Array.from(data) }),
  getLocal: async (id: string) => {
    const isWindows = navigator.userAgent.includes('Windows');
    const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
    return `${baseUrl}/files/${encodeURIComponent(id)}`;
  },
  
  folders: {
    getAll: async () => await invoke('file_folders_get_all'),
    create: async (folder: any) => await invoke('file_folders_create', { folder }),
    update: async (folder: any) => await invoke('file_folders_update', { folder }),
    delete: async (id: string) => await invoke('file_folders_delete', { id })
  },
  
  links: {
    getByPage: async (pageId: string) => await invoke('file_links_get_by_page', { pageId }),
    getByFile: async (fileId: string) => await invoke('file_links_get_by_file', { fileId }),
    create: async (link: any) => await invoke('file_links_create', { link }),
    delete: async (id: string) => await invoke('file_links_delete', { id })
  }
};
