import { sqliteGetAll, sqliteQuery } from './bridgeClient';
import type { AppNotification } from '../../types/notifications';

export const webviewNotificationsApi = {
  async getAll(): Promise<AppNotification[]> {
    const rows = await sqliteGetAll<any>(
      `SELECT * FROM notifications WHERE deleted_at IS NULL ORDER BY created_at DESC`
    );
    return rows.map((r) => ({
      ...r,
      is_read: Boolean(r.is_read),
    }));
  },

  async add(notif: Partial<AppNotification>): Promise<AppNotification> {
    const id = notif.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newNotif: AppNotification = {
      id,
      title: notif.title || 'Notificação',
      message: notif.message || '',
      type: notif.type || 'system',
      target_page_id: notif.target_page_id || null,
      event_id: notif.event_id || null,
      scheduled_for: notif.scheduled_for || null,
      fired_at: notif.fired_at || now,
      is_read: notif.is_read || false,
      created_at: notif.created_at || now,
    };

    await sqliteQuery(
      `INSERT INTO notifications (id, title, message, type, target_page_id, event_id, scheduled_for, fired_at, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newNotif.id,
        newNotif.title,
        newNotif.message,
        newNotif.type,
        newNotif.target_page_id,
        newNotif.event_id,
        newNotif.scheduled_for,
        newNotif.fired_at,
        newNotif.is_read ? 1 : 0,
        newNotif.created_at,
      ]
    );

    return newNotif;
  },

  async markRead(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE notifications SET is_read = 1, updated_at = ? WHERE id = ?`, [now, id]);
    return true;
  },

  async delete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE notifications SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    return true;
  },
};
