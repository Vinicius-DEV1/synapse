import { invoke } from '@tauri-apps/api/core';

export const tauriCalendarApi = {
  getEvents: async () => await invoke('calendar_get_events'),
  createEvent: async (e: any) => await invoke('calendar_add_event', { event: e }),
  updateEvent: async (e: any) => await invoke('calendar_update_event', { event: e }),
  deleteEvent: async (id: string) => await invoke('calendar_delete_event', { id })
};
