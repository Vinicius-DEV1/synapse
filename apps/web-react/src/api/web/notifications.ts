import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { AppNotification } from '../../types/notifications';

export const webNotificationsApi = (db: IDBPDatabase<CadernoDBSchema>) => ({
  getNotifications: async (): Promise<AppNotification[]> => {
    const all = (await db.getAll('notifications')) || [];
    return all
      .filter((n: AppNotification) => !n.deleted_at)
      .sort((a: AppNotification, b: AppNotification) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  },
  addNotification: async (notif: Partial<AppNotification>): Promise<AppNotification> => {
    const id = (notif.id && notif.id !== '') ? notif.id : crypto.randomUUID();
    const newNotif: AppNotification = {
      id,
      title: notif.title || '',
      message: notif.message || '',
      type: notif.type || 'system',
      target_page_id: notif.target_page_id || null,
      event_id: notif.event_id || null,
      scheduled_for: notif.scheduled_for || null,
      fired_at: notif.fired_at || new Date().toISOString(),
      is_read: notif.is_read ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('notifications', newNotif);
    return newNotif;
  },
  markRead: async (id?: string): Promise<boolean> => {
    if (id) {
      const existing = await db.get('notifications', id);
      if (existing) {
        existing.is_read = true;
        existing.updated_at = new Date().toISOString();
        await db.put('notifications', existing);
      }
    } else {
      const all = (await db.getAll('notifications')) || [];
      for (const n of all) {
        if (!n.is_read && !n.deleted_at) {
          n.is_read = true;
          n.updated_at = new Date().toISOString();
          await db.put('notifications', n);
        }
      }
    }
    return true;
  },
  deleteNotification: async (id: string): Promise<boolean> => {
    const existing = await db.get('notifications', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('notifications', existing);
      return true;
    }
    return false;
  }
});
