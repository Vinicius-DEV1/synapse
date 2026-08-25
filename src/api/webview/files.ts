import { sqliteGetAll, sqliteGetFirst, sqliteQuery, sendBridgeMessage } from './bridgeClient';

export const webviewFilesApi = {
  async getAll() {
    return await sqliteGetAll(
      `SELECT * FROM files WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
  },

  async getById(id: string) {
    return await sqliteGetFirst(
      `SELECT * FROM files WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
  },

  async create(file: any) {
    const id = file.id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newFile = {
      ...file,
      id,
      created_at: file.created_at || now,
      updated_at: file.updated_at || now,
    };

    await sqliteQuery(
      `INSERT INTO files (id, name, file_type, file_size, local_path, drive_file_id, folder_id, mime_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newFile.id,
        newFile.name || 'Arquivo',
        newFile.file_type || 'other',
        newFile.file_size || 0,
        newFile.local_path || null,
        newFile.drive_file_id || null,
        newFile.folder_id || null,
        newFile.mime_type || null,
        newFile.created_at,
        newFile.updated_at,
      ]
    );

    return newFile;
  },

  async update(file: any) {
    const now = new Date().toISOString();
    const result = await sqliteQuery(
      `UPDATE files SET name = COALESCE(?, name), folder_id = ?, updated_at = ? WHERE id = ?`,
      [file.name, file.folder_id, now, file.id]
    );
    return result?.changes || 1;
  },

  async delete(id: string) {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE files SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    return true;
  },

  async move(id: string, folderId: string | null) {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE files SET folder_id = ?, updated_at = ? WHERE id = ?`, [folderId, now, id]);
    return true;
  },

  async saveLocal(filename: string, fileData: string) {
    try {
      const savedPath = await sendBridgeMessage<string>('FS_SAVE_BASE64', {
        filename,
        data: fileData,
      });
      return savedPath;
    } catch {
      return '';
    }
  },

  async getLocal(id: string) {
    const file = await sqliteGetFirst<any>(`SELECT local_path FROM files WHERE id = ?`, [id]);
    return file?.local_path || '';
  },

  folders: {
    async getAll() {
      return await sqliteGetAll(
        `SELECT * FROM file_folders WHERE deleted_at IS NULL ORDER BY name ASC`
      );
    },

    async create(folder: any) {
      const id = folder.id || `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const newFolder = {
        ...folder,
        id,
        created_at: folder.created_at || now,
        updated_at: folder.updated_at || now,
      };

      await sqliteQuery(
        `INSERT INTO file_folders (id, name, parent_id, color, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newFolder.id,
          newFolder.name || 'Nova Pasta',
          newFolder.parent_id || null,
          newFolder.color || '#6366f1',
          newFolder.created_at,
          newFolder.updated_at,
        ]
      );

      return newFolder;
    },

    async update(folder: any) {
      const now = new Date().toISOString();
      await sqliteQuery(
        `UPDATE file_folders SET name = COALESCE(?, name), parent_id = ?, color = COALESCE(?, color), updated_at = ? WHERE id = ?`,
        [folder.name, folder.parent_id, folder.color, now, folder.id]
      );
      return 1;
    },

    async delete(id: string) {
      const now = new Date().toISOString();
      await sqliteQuery(
        `UPDATE file_folders SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, id]
      );
      return true;
    },
  },

  links: {
    async getByPage(pageId: string) {
      return await sqliteGetAll(
        `SELECT * FROM file_page_links WHERE page_id = ? AND deleted_at IS NULL`,
        [pageId]
      );
    },
    async getByFile(fileId: string) {
      return await sqliteGetAll(
        `SELECT * FROM file_page_links WHERE file_id = ? AND deleted_at IS NULL`,
        [fileId]
      );
    },
    async create(link: any) {
      const id = link.id || `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      await sqliteQuery(
        `INSERT INTO file_page_links (id, file_id, page_id, link_type, widget_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, link.file_id, link.page_id, link.link_type || 'upload', link.widget_id || null, now, now]
      );
      return { id, ...link, created_at: now, updated_at: now };
    },
    async delete(id: string) {
      const now = new Date().toISOString();
      await sqliteQuery(
        `UPDATE file_page_links SET deleted_at = ?, updated_at = ? WHERE id = ?`,
        [now, now, id]
      );
      return true;
    },
  },
};
