import { invoke } from '@tauri-apps/api/core';
import type { CalendarEvent } from '../../types/calendar';

export const tauriCalendarApi = {
  getEvents: async (): Promise<CalendarEvent[]> => {
    return await invoke('calendar_get_events');
  },
  getEvent: async (id: string): Promise<CalendarEvent | null> => {
    return await invoke('calendar_get_event', { id });
  },
  createEvent: async (e: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const cleanE: Record<string, any> = { ...e };
    delete cleanE.type_;
    const payload = {
      ...cleanE,
      id: (e.id && e.id !== '') ? e.id : crypto.randomUUID(),
      title: e.title || '',
      type: e.type || 'event',
      status: e.status || 'pending',
      color: e.color || '#3b82f6',
      reminders: Array.isArray(e.reminders) ? e.reminders : (e.reminders ? JSON.parse(String(e.reminders)) : []),
      notified_reminders: Array.isArray(e.notified_reminders) ? e.notified_reminders : (e.notified_reminders ? JSON.parse(String(e.notified_reminders)) : [])
    };
    return await invoke('calendar_add_event', { event: payload });
  },
  updateEvent: async (idOrEvent: string | any, eventData?: any): Promise<{ success: boolean }> => {
    let targetEvent: any;
    let targetId: string | null = null;
    if (typeof idOrEvent === 'string') {
      targetId = idOrEvent;
      targetEvent = { ...(eventData || {}), id: idOrEvent };
    } else {
      targetEvent = { ...idOrEvent };
      targetId = targetEvent.id || null;
    }
    if ('type_' in targetEvent) {
      if (!targetEvent.type) {
        targetEvent.type = targetEvent.type_;
      }
      delete targetEvent.type_;
    }
    await invoke('calendar_update_event', { id: targetId, event: targetEvent });
    return { success: true };
  },
  deleteEvent: async (id: string): Promise<boolean> => {
    return await invoke('calendar_delete_event', { id });
  }
};

