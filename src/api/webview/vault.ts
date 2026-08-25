import { sqliteGetAll, sqliteGetFirst, sqliteQuery } from './bridgeClient';
import type { VaultGroup, VaultItem } from '../../types/vault';

export const webviewVaultApi = {
  async getGroups(): Promise<VaultGroup[]> {
    return await sqliteGetAll<VaultGroup>(
      `SELECT * FROM vault_groups WHERE deleted_at IS NULL ORDER BY position ASC, name ASC`
    );
  },

  async upsertGroup(group: Partial<VaultGroup>): Promise<VaultGroup> {
    const id = group.id || `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newGroup: VaultGroup = {
      id,
      name: group.name || 'Novo Grupo',
      icon: group.icon || 'folder',
      color: group.color || '#6366f1',
      position: group.position || 0,
      created_at: group.created_at || now,
      updated_at: group.updated_at || now,
      deleted_at: null,
    };

    await sqliteQuery(
      `INSERT OR REPLACE INTO vault_groups (id, name, icon, color, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [newGroup.id, newGroup.name, newGroup.icon, newGroup.color, newGroup.position, newGroup.created_at, newGroup.updated_at]
    );

    return newGroup;
  },

  async deleteGroup(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE vault_groups SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    return true;
  },

  async getItems(groupId?: string): Promise<VaultItem[]> {
    if (groupId) {
      return await sqliteGetAll<VaultItem>(
        `SELECT * FROM vault_items WHERE group_id = ? AND deleted_at IS NULL ORDER BY is_favorite DESC, label ASC`,
        [groupId]
      );
    }
    return await sqliteGetAll<VaultItem>(
      `SELECT * FROM vault_items WHERE deleted_at IS NULL ORDER BY is_favorite DESC, label ASC`
    );
  },

  async getItem(id: string): Promise<VaultItem | null> {
    return await sqliteGetFirst<VaultItem>(
      `SELECT * FROM vault_items WHERE id = ? AND deleted_at IS NULL`,
      [id]
    );
  },

  async upsertItem(item: Partial<VaultItem>): Promise<VaultItem> {
    const id = item.id || `vitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newItem: VaultItem = {
      id,
      group_id: item.group_id || 'default',
      label: item.label || 'Sem nome',
      username: item.username || '',
      email: item.email || '',
      password: item.password || '',
      url: item.url || '',
      notes: item.notes || '',
      custom_fields: item.custom_fields || '[]',
      is_favorite: item.is_favorite ?? 0,
      password_changed_at: item.password_changed_at || now,
      password_strength: item.password_strength || 0,
      created_at: item.created_at || now,
      updated_at: item.updated_at || now,
      deleted_at: null,
    };

    await sqliteQuery(
      `INSERT OR REPLACE INTO vault_items (id, group_id, label, username, email, password, url, notes, custom_fields, is_favorite, password_changed_at, password_strength, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newItem.id,
        newItem.group_id,
        newItem.label,
        newItem.username,
        newItem.email,
        newItem.password,
        newItem.url,
        newItem.notes,
        typeof newItem.custom_fields === 'string' ? newItem.custom_fields : JSON.stringify(newItem.custom_fields),
        newItem.is_favorite ? 1 : 0,
        newItem.password_changed_at,
        newItem.password_strength,
        newItem.created_at,
        newItem.updated_at,
      ]
    );

    return newItem;
  },

  async deleteItem(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE vault_items SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    return true;
  },
};
