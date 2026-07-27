import { invoke } from '@tauri-apps/api/core';
import type { AppNotification } from '../../types/core';

export const tauriNotificationsApi = {
  getNotifications: async (): Promise<AppNotification[]> => {
    return await invoke('notifications_get_all');
  },
  addNotification: async (notif: Partial<AppNotification>): Promise<AppNotification> => {
    return await invoke('notifications_add', { notif });
  },
  markRead: async (id?: string): Promise<boolean> => {
    return await invoke('notifications_mark_read', { id: id || null });
  },
  deleteNotification: async (id: string): Promise<boolean> => {
    return await invoke('notifications_delete', { id });
  }
};
