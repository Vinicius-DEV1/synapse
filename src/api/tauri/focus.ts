import { invoke } from '@tauri-apps/api/core';

export const tauriFocusApi = {
  getSessions: async () => await invoke('focus_get_sessions'),
  createSession: async (s: any) => await invoke('focus_create_session', { session: s }),
  deleteSessions: async () => {}, // mock
  getAlarms: async () => await invoke('focus_get_alarms'),
  createAlarm: async (a: any) => await invoke('focus_create_alarm', { alarm: a }),
  updateAlarm: async (id: string, a: any) => await invoke('focus_update_alarm', { id, alarm: a }),
  deleteAlarm: async (id: string) => await invoke('focus_delete_alarm', { id }),
  setAppIcon: async (type: string) => {} // mock
};
