import { sqliteGetAll, sqliteQuery } from './bridgeClient';
import type { CalendarEvent } from '../../types/calendar';

export const webviewCalendarApi = {
  async getEvents(): Promise<CalendarEvent[]> {
    return await sqliteGetAll<CalendarEvent>(
      `SELECT * FROM calendar_events WHERE deleted_at IS NULL ORDER BY start_date ASC`
    );
  },

  async addEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const id = event.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newEvent: CalendarEvent = {
      id,
      title: event.title || 'Novo Evento',
      description: event.description || '',
      start_date: event.start_date || now,
      end_date: event.end_date || now,
      type: (event.type as any) || 'event',
      status: event.status || 'pending',
      color: event.color || '#3b82f6',
      page_id: event.page_id || null,
      reminders: Array.isArray(event.reminders) ? event.reminders : [],
      notified_reminders: Array.isArray(event.notified_reminders) ? event.notified_reminders : [],
      recurrence_rule: event.recurrence_rule || null,
      reminder_minutes: event.reminder_minutes || null,
      created_at: event.created_at || now,
      updated_at: event.updated_at || now,
    };

    await sqliteQuery(
      `INSERT INTO calendar_events (id, title, description, start_date, end_date, type, status, color, page_id, reminders, notified_reminders, recurrence_rule, reminder_minutes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newEvent.id,
        newEvent.title,
        newEvent.description,
        newEvent.start_date,
        newEvent.end_date,
        newEvent.type,
        newEvent.status,
        newEvent.color,
        newEvent.page_id,
        JSON.stringify(newEvent.reminders || []),
        JSON.stringify(newEvent.notified_reminders || []),
        newEvent.recurrence_rule,
        newEvent.reminder_minutes,
        newEvent.created_at,
        newEvent.updated_at,
      ]
    );

    return newEvent;
  },

  async updateEvent(event: Partial<CalendarEvent> & { id: string }): Promise<CalendarEvent> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const params: any[] = [];

    if (event.title !== undefined) { fields.push('title = ?'); params.push(event.title); }
    if (event.description !== undefined) { fields.push('description = ?'); params.push(event.description); }
    if (event.start_date !== undefined) { fields.push('start_date = ?'); params.push(event.start_date); }
    if (event.end_date !== undefined) { fields.push('end_date = ?'); params.push(event.end_date); }
    if (event.type !== undefined) { fields.push('type = ?', 'type_ = ?'); params.push(event.type, event.type); }
    if (event.status !== undefined) { fields.push('status = ?'); params.push(event.status); }
    if (event.color !== undefined) { fields.push('color = ?'); params.push(event.color); }
    if (event.page_id !== undefined) { fields.push('page_id = ?'); params.push(event.page_id); }
    if (event.reminders !== undefined) {
      fields.push('reminders = ?');
      params.push(typeof event.reminders === 'string' ? event.reminders : JSON.stringify(event.reminders));
    }
    if (event.notified_reminders !== undefined) {
      fields.push('notified_reminders = ?');
      params.push(typeof event.notified_reminders === 'string' ? event.notified_reminders : JSON.stringify(event.notified_reminders));
    }

    fields.push('updated_at = ?');
    params.push(now);

    params.push(event.id);
    await sqliteQuery(`UPDATE calendar_events SET ${fields.join(', ')} WHERE id = ?`, params);

    const rows = await sqliteGetAll<CalendarEvent>(`SELECT * FROM calendar_events WHERE id = ?`, [event.id]);
    return rows[0] || (event as CalendarEvent);
  },

  async deleteEvent(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE calendar_events SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, id]);
    return true;
  },
};
