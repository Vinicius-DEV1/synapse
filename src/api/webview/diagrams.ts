import { sqliteGetAll, sqliteGetFirst, sqliteQuery } from './bridgeClient';
import type { DiagramMeta, DiagramContent } from '../../types/diagrams';

export const webviewDiagramsApi = {
  async getAll(): Promise<DiagramMeta[]> {
    return await sqliteGetAll<DiagramMeta>(
      `SELECT id, title, icon, created_at, updated_at FROM diagrams WHERE deleted_at IS NULL ORDER BY updated_at DESC`
    );
  },

  async getContent(id: string): Promise<DiagramContent | null> {
    const row = await sqliteGetFirst<any>(`SELECT id, content, encrypted_content FROM diagrams WHERE id = ?`, [id]);
    if (!row) return null;
    return {
      content: row.content || '',
      encrypted_content: row.encrypted_content || undefined,
    };
  },

  async create(data: { title: string; content?: string; encrypted_content?: string; icon?: string }): Promise<DiagramMeta> {
    const id = `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const meta: DiagramMeta = {
      id,
      title: data.title || 'Novo Diagrama',
      icon: data.icon || '🎨',
      created_at: now,
      updated_at: now,
    };

    await sqliteQuery(
      `INSERT INTO diagrams (id, title, content, encrypted_content, icon, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, meta.title, data.content || '', data.encrypted_content || null, meta.icon, now, now]
    );

    return meta;
  },

  async update(id: string, data: { title?: string; content?: string; encrypted_content?: string; icon?: string }): Promise<boolean> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
    if (data.content !== undefined) { fields.push('content = ?'); params.push(data.content); }
    if (data.encrypted_content !== undefined) { fields.push('encrypted_content = ?'); params.push(data.encrypted_content); }
    if (data.icon !== undefined) { fields.push('icon = ?'); params.push(data.icon); }

    fields.push('updated_at = ?');
    params.push(now);

    params.push(id);
    await sqliteQuery(`UPDATE diagrams SET ${fields.join(', ')} WHERE id = ?`, params);
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE diagrams SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    return true;
  },
};
