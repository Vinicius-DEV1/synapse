import type { FilesApi } from '../types';
import type { FileFolder, FileItem, FilePageLink } from '../../types/files';

export const webFilesApi = (db: any, generateId: () => string): FilesApi => {
  return {
    getAll: async (): Promise<FileItem[]> => {
      const all: FileItem[] = (await db.getAll('files')) || [];
      return all.filter((f) => !f.deleted_at);
    },
    getById: async (id: string): Promise<FileItem | null> => {
      const file: FileItem | undefined = await db.get('files', id);
      return file && !file.deleted_at ? file : null;
    },
    create: async (file: Partial<FileItem> & { name: string; file_type: string; file_size: number }): Promise<FileItem> => {
      const newFile: FileItem = {
        id: file.id || generateId(),
        name: file.name,
        file_type: file.file_type,
        file_size: file.file_size,
        local_path: file.local_path ?? null,
        drive_file_id: file.drive_file_id ?? null,
        folder_id: file.folder_id ?? null,
        mime_type: file.mime_type ?? null,
        created_at: file.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: file.deleted_at ?? null,
      };
      await db.put('files', newFile);
      return newFile;
    },
    update: async (file: FileItem): Promise<number> => {
      const existing: FileItem | undefined = await db.get('files', file.id);
      if (!existing) return 0;
      await db.put('files', { ...existing, ...file, updated_at: new Date().toISOString() });
      return 1;
    },
    delete: async (id: string): Promise<boolean> => {
      const existing: FileItem | undefined = await db.get('files', id);
      if (!existing) return false;
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('files', existing);
      return true;
    },
    move: async (id: string, folderId: string | null): Promise<boolean> => {
      const existing: FileItem | undefined = await db.get('files', id);
      if (!existing) return false;
      existing.folder_id = folderId;
      existing.updated_at = new Date().toISOString();
      await db.put('files', existing);
      return true;
    },
    saveLocal: async (_filename: string, _data: Uint8Array): Promise<string> => {
      // Stub for Web: binary files are saved in Google Drive or stored in memory
      return '';
    },
    getLocal: async (_id: string): Promise<string | null> => {
      return null;
    },
    folders: {
      getAll: async (): Promise<FileFolder[]> => {
        const all: FileFolder[] = (await db.getAll('file_folders')) || [];
        return all.filter((f) => !f.deleted_at);
      },
      create: async (folder: Partial<FileFolder> & { name: string }): Promise<FileFolder> => {
        const newFolder: FileFolder = {
          id: folder.id || generateId(),
          name: folder.name,
          parent_id: folder.parent_id ?? null,
          color: folder.color || '#6366f1',
          created_at: folder.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: folder.deleted_at ?? null,
        };
        await db.put('file_folders', newFolder);
        return newFolder;
      },
      update: async (folder: FileFolder): Promise<number> => {
        const existing: FileFolder | undefined = await db.get('file_folders', folder.id);
        if (!existing) return 0;
        await db.put('file_folders', { ...existing, ...folder, updated_at: new Date().toISOString() });
        return 1;
      },
      delete: async (id: string): Promise<boolean> => {
        const existing: FileFolder | undefined = await db.get('file_folders', id);
        if (!existing) return false;
        existing.deleted_at = new Date().toISOString();
        existing.updated_at = new Date().toISOString();
        await db.put('file_folders', existing);
        return true;
      }
    },
    links: {
      getByPage: async (pageId: string): Promise<FilePageLink[]> => {
        const all: FilePageLink[] = (await db.getAll('file_page_links')) || [];
        return all.filter((l) => l.page_id === pageId && !l.deleted_at);
      },
      getByFile: async (fileId: string): Promise<FilePageLink[]> => {
        const all: FilePageLink[] = (await db.getAll('file_page_links')) || [];
        return all.filter((l) => l.file_id === fileId && !l.deleted_at);
      },
      create: async (link: Partial<FilePageLink> & { file_id: string; page_id: string }): Promise<FilePageLink> => {
        const newLink: FilePageLink = {
          id: link.id || generateId(),
          file_id: link.file_id,
          page_id: link.page_id,
          link_type: link.link_type || 'link',
          widget_id: link.widget_id ?? null,
          created_at: link.created_at || new Date().toISOString(),
          deleted_at: link.deleted_at ?? null,
        };
        await db.put('file_page_links', newLink);
        return newLink;
      },
      delete: async (id: string): Promise<boolean> => {
        const link: FilePageLink | undefined = await db.get('file_page_links', id);
        if (link) {
          link.deleted_at = new Date().toISOString();
          await db.put('file_page_links', link);
        }
        return true;
      }
    }
  };
};
