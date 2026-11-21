import { invoke } from '@tauri-apps/api/core';

export const tauriFocusApi = {
  getSessions: async () => await invoke('focus_get_sessions'),
  createSession: async (s: any) => await invoke('focus_create_session', { session: s }),
  deleteSessions: async (
    options?:
      | { type: 'specific'; id: number | string }
      | { type: 'all' }
      | { type: 'today' }
      | { type: 'last7days' }
  ) => {
    try {
      await invoke('focus_delete_sessions', { options: options || { type: 'all' } });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },
  getAlarms: async () => await invoke('focus_get_alarms'),
  createAlarm: async (a: any) => await invoke('focus_create_alarm', { alarm: a }),
  updateAlarm: async (id: string, a: any) => await invoke('focus_update_alarm', { id, alarm: a }),
  deleteAlarm: async (id: string) => await invoke('focus_delete_alarm', { id }),
  setAppIcon: async (_type: string) => {} // mock
};
