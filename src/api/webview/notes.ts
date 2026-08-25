import { sqliteGetAll, sqliteGetFirst, sqliteQuery, sqliteExec } from './bridgeClient';
import type { Page, PageHistoryEntry } from '../../types/notes';

export const webviewNotesApi = {
  async getAllPages(): Promise<Page[]> {
    const rows = await sqliteGetAll<any>(
      `SELECT * FROM pages WHERE deleted_at IS NULL ORDER BY sort_order ASC, created_at DESC`
    );
    return rows.map((r) => ({
      ...r,
      is_pinned: Boolean(r.is_pinned),
      is_locked: Boolean(r.is_locked),
    }));
  },

  async getPageContent(id: string): Promise<string> {
    const row = await sqliteGetFirst<{ content: string }>(
      `SELECT content FROM pages WHERE id = ?`,
      [id]
    );
    return row ? row.content : '';
  },

  async createPage(page: Partial<Page>): Promise<Page> {
    const id = page.id || `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const title = page.title || 'Sem título';
    const content = page.content || '';
    const parentId = page.parent_id || null;
    const icon = page.icon || 'file';
    const sortOrder = page.sort_order || 0;

    await sqliteQuery(
      `INSERT INTO pages (id, parent_id, title, content, icon, sort_order, created_at, updated_at, deleted_at, is_pinned, is_locked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        id,
        parentId,
        title,
        content,
        icon,
        sortOrder,
        page.created_at || now,
        page.updated_at || now,
        page.is_pinned ? 1 : 0,
        page.is_locked ? 1 : 0,
      ]
    );

    return {
      id,
      parent_id: parentId,
      title,
      content,
      icon,
      sort_order: sortOrder,
      created_at: page.created_at || now,
      updated_at: page.updated_at || now,
      is_pinned: page.is_pinned ? 1 : 0,
      is_locked: page.is_locked ? 1 : 0,
    };
  },

  async updatePage(page: Partial<Page> & { id: string }): Promise<void> {
    const fields: string[] = [];
    const params: any[] = [];

    if (page.title !== undefined) {
      fields.push('title = ?');
      params.push(page.title);
    }
    if (page.content !== undefined) {
      fields.push('content = ?');
      params.push(page.content);
    }
    if (page.parent_id !== undefined) {
      fields.push('parent_id = ?');
      params.push(page.parent_id);
    }
    if (page.icon !== undefined) {
      fields.push('icon = ?');
      params.push(page.icon);
    }
    if (page.sort_order !== undefined) {
      fields.push('sort_order = ?');
      params.push(page.sort_order);
    }
    if (page.crdt_state !== undefined) {
      fields.push('crdt_state = ?');
      params.push(page.crdt_state);
    }
    if (page.is_pinned !== undefined) {
      fields.push('is_pinned = ?');
      params.push(page.is_pinned ? 1 : 0);
    }
    if (page.is_locked !== undefined) {
      fields.push('is_locked = ?');
      params.push(page.is_locked ? 1 : 0);
    }
    if (page.cover_image !== undefined) {
      fields.push('cover_image = ?');
      params.push(page.cover_image);
    }
    if (page.description !== undefined) {
      fields.push('description = ?');
      params.push(page.description);
    }

    fields.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(page.id);

    await sqliteQuery(
      `UPDATE pages SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
  },

  async deletePage(id: string): Promise<void> {
    const now = new Date().toISOString();
    // Soft delete page and subpages recursively
    await sqliteExec(`
      WITH RECURSIVE subpages(id) AS (
        SELECT id FROM pages WHERE id = '${id}'
        UNION ALL
        SELECT p.id FROM pages p JOIN subpages s ON p.parent_id = s.id
      )
      UPDATE pages SET deleted_at = '${now}' WHERE id IN (SELECT id FROM subpages);
    `);
  },

  async getDeletedPages(): Promise<Page[]> {
    return await sqliteGetAll<Page>(
      `SELECT * FROM pages WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`
    );
  },

  async restorePage(id: string): Promise<void> {
    await sqliteQuery(
      `UPDATE pages SET deleted_at = NULL, updated_at = ? WHERE id = ?`,
      [new Date().toISOString(), id]
    );
  },

  async reorderPages(): Promise<boolean> {
    return true;
  },

  async getPageHistory(pageId: string): Promise<PageHistoryEntry[]> {
    return await sqliteGetAll<PageHistoryEntry>(
      `SELECT * FROM page_history WHERE page_id = ? ORDER BY created_at DESC`,
      [pageId]
    );
  },
};
