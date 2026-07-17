import { invoke } from '@tauri-apps/api/core';
import { FileItem } from '../../types';

export const tauriFilesApi = {
  getAll: async () => await invoke('files_get_all'),
  getById: async (id: string) => await invoke('files_get_by_id', { id }),
  create: async (file: Omit<FileItem, 'id' | 'created_at' | 'updated_at'>) => await invoke('files_create', { file }),
  update: async (id: string, file: Partial<FileItem>) => await invoke('files_update', { id, file }),
  delete: async (id: string) => await invoke('files_delete', { id }),
  move: async (id: string, folderId: string | null) => await invoke('files_move', { id, folderId }),
  saveLocal: async (filename: string, data: number[]) => await invoke('files_save_local', { filename, data }),
  getLocal: async (id: string) => `http://encrypted.localhost/files/${encodeURIComponent(id)}`,
  
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
