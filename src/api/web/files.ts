export const webFilesApi = (db: any, generateId: () => string) => {
  return {
    getAll: async () => {
      const all = await db.getAll('files');
      return all.filter((f: any) => !f.deleted_at);
    },
    getById: async (id: string) => {
      const file = await db.get('files', id);
      return file && !file.deleted_at ? file : null;
    },
    create: async (file: any) => {
      const newFile = {
        ...file,
        id: file.id || generateId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.put('files', newFile);
      return newFile;
    },
    update: async (file: any) => {
      const existing = await db.get('files', file.id);
      if (!existing) return 0;
      await db.put('files', { ...existing, ...file, updated_at: new Date().toISOString() });
      return 1;
    },
    delete: async (id: string) => {
      const existing = await db.get('files', id);
      if (!existing) return false;
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('files', existing);
      return true;
    },
    move: async (id: string, folderId: string | null) => {
      const existing = await db.get('files', id);
      if (!existing) return false;
      existing.parent_id = folderId;
      existing.updated_at = new Date().toISOString();
      await db.put('files', existing);
      return true;
    },
    saveLocal: async (filename: string, fileData: any) => {
      // Stub for Web: we don't save binary files locally via API, they go to Drive or IndexedDB
      return "";
    },
    getLocal: async (id: string) => {
      return "";
    },
    folders: {
      getAll: async () => {
        const all = await db.getAll('file_folders');
        return all.filter((f: any) => !f.deleted_at);
      },
      create: async (folder: any) => {
        const newFolder = {
          ...folder,
          id: folder.id || generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.put('file_folders', newFolder);
        return newFolder;
      },
      update: async (folder: any) => {
        const existing = await db.get('file_folders', folder.id);
        if (!existing) return 0;
        await db.put('file_folders', { ...existing, ...folder, updated_at: new Date().toISOString() });
        return 1;
      },
      delete: async (id: string) => {
        const existing = await db.get('file_folders', id);
        if (!existing) return false;
        existing.deleted_at = new Date().toISOString();
        existing.updated_at = new Date().toISOString();
        await db.put('file_folders', existing);
        return true;
      }
    },
    links: {
      getByPage: async (pageId: string) => {
        const all = await db.getAll('file_page_links');
        return all.filter((l: any) => l.page_id === pageId);
      },
      getByFile: async (fileId: string) => {
        const all = await db.getAll('file_page_links');
        return all.filter((l: any) => l.file_id === fileId);
      },
      create: async (link: any) => {
        const newLink = {
          ...link,
          id: link.id || generateId(),
          created_at: new Date().toISOString(),
        };
        await db.put('file_page_links', newLink);
        return newLink;
      },
      delete: async (id: string) => {
        await db.delete('file_page_links', id);
        return true;
      }
    }
  };
};
