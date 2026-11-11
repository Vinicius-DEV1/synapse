import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { CalendarEvent } from '../../types/calendar';

export const webCalendarApi = (db: IDBPDatabase<CadernoDBSchema>) => ({
  getEvents: async (): Promise<CalendarEvent[]> => {
    const all = (await db.getAll('calendar_events')) || [];
    return all.filter((e: CalendarEvent) => !e.deleted_at);
  },
  getEvent: async (id: string): Promise<CalendarEvent | null> => {
    const existing = await db.get('calendar_events', id);
    if (!existing || existing.deleted_at) return null;
    return existing;
  },
  createEvent: async (event: Partial<CalendarEvent>): Promise<CalendarEvent> => {
    const id = (event.id && event.id !== '') ? event.id : crypto.randomUUID();
    const newEvent: CalendarEvent = {
      title: '',
      description: '',
      start_date: new Date().toISOString(),
      end_date: new Date().toISOString(),
      type: 'event',
      status: 'pending',
      color: '#3b82f6',
      ...event,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('calendar_events', newEvent);
    return newEvent;
  },
  updateEvent: async (id: string, event: Partial<CalendarEvent>): Promise<{ success: boolean }> => {
    const existing = await db.get('calendar_events', id);
    if (!existing) return { success: false };
    const updated: CalendarEvent = { ...existing, ...event, updated_at: new Date().toISOString() };
    await db.put('calendar_events', updated);
    return { success: true };
  },
  deleteEvent: async (id: string): Promise<boolean> => {
    const existing = await db.get('calendar_events', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('calendar_events', existing);
      return true;
    }
    return false;
  }
});
