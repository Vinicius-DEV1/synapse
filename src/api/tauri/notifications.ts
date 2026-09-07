import { invoke } from '@tauri-apps/api/core';
import type { AppNotification } from '../../types/notifications';

export const tauriNotificationsApi = {
  getNotifications: async (): Promise<AppNotification[]> => {
    return await invoke('notifications_get_all');
  },
  addNotification: async (notif: Partial<AppNotification>): Promise<AppNotification> => {
    const payload = {
      id: (notif.id && notif.id !== '') ? notif.id : crypto.randomUUID(),
      title: notif.title || '',
      message: notif.message || '',
      type: notif.type || 'system',
      type_: notif.type || 'system',
      target_page_id: notif.target_page_id || null,
      event_id: notif.event_id || null,
      scheduled_for: notif.scheduled_for || null,
      fired_at: notif.fired_at || new Date().toISOString(),
      is_read: notif.is_read ?? false,
      created_at: notif.created_at || new Date().toISOString(),
    };
    return await invoke('notifications_add', { notif: payload });
  },
  markRead: async (id?: string): Promise<boolean> => {
    return await invoke('notifications_mark_read', { id: id || null });
  },
  deleteNotification: async (id: string): Promise<boolean> => {
    return await invoke('notifications_delete', { id });
  }
};
