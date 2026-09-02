import { invoke } from '@tauri-apps/api/core';
import type { FilesApi } from '../types';
import type { FileFolder, FileItem, FilePageLink } from '../../types/files';

export const tauriFilesApi: FilesApi = {
  getAll: async (): Promise<FileItem[]> => await invoke('files_get_all'),
  getById: async (id: string): Promise<FileItem | null> => await invoke('files_get_by_id', { id }),
  create: async (file: Partial<FileItem> & { name: string; file_type: string; file_size: number }): Promise<FileItem> =>
    await invoke('files_create', { file }),
  update: async (file: FileItem): Promise<number> => await invoke('files_update', { id: file.id, file }),
  delete: async (id: string): Promise<boolean> => await invoke('files_delete', { id }),
  move: async (id: string, folderId: string | null): Promise<boolean> => await invoke('files_move', { id, folderId }),
  saveLocal: async (filename: string, data: Uint8Array): Promise<string> =>
    await invoke('files_save_local', { filename, data: Array.from(data) }),
  getLocal: async (idOrPath: string): Promise<string | null> => {
    try {
      const { getBaseAppDir } = await import('./path');
      const { join } = await import('@tauri-apps/api/path');
      const { exists } = await import('@tauri-apps/plugin-fs');
      const dataDir = await getBaseAppDir();

      const clean = idOrPath.replace(/^file:\/\//, '');
      const filename = clean.split(/[/\\]/).pop() || idOrPath;

      const candidates = [
        clean.startsWith('/') || clean.match(/^[a-zA-Z]:/) ? clean : await join(dataDir, 'files', clean),
        await join(dataDir, 'files', filename),
        await join(dataDir, 'files', `${filename}.enc`),
        await join(dataDir, clean),
      ];

      let foundPath: string | null = null;
      for (const c of candidates) {
        try {
          if (await exists(c)) {
            foundPath = c;
            break;
          }
        } catch {}
      }

      if (!foundPath) return null;

      const isWindows = navigator.userAgent.includes('Windows');
      const baseUrl = isWindows ? 'http://encrypted.localhost' : 'encrypted://localhost';
      return `${baseUrl}/files/${encodeURIComponent(foundPath)}`;
    } catch {
      return null;
    }
  },
  
  folders: {
    getAll: async (): Promise<FileFolder[]> => await invoke('file_folders_get_all'),
    create: async (folder: Partial<FileFolder> & { name: string }): Promise<FileFolder> =>
      await invoke('file_folders_create', { folder }),
    update: async (folder: FileFolder): Promise<number> => await invoke('file_folders_update', { folder }),
    delete: async (id: string): Promise<boolean> => await invoke('file_folders_delete', { id })
  },
  
  links: {
    getByPage: async (pageId: string): Promise<FilePageLink[]> => await invoke('file_links_get_by_page', { pageId }),
    getByFile: async (fileId: string): Promise<FilePageLink[]> => await invoke('file_links_get_by_file', { fileId }),
    create: async (link: Partial<FilePageLink> & { file_id: string; page_id: string }): Promise<FilePageLink> =>
      await invoke('file_links_create', { link }),
    delete: async (id: string): Promise<boolean> => await invoke('file_links_delete', { id })
  }
};
