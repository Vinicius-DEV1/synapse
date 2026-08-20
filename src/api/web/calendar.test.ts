import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webCalendarApi } from './calendar';

describe('webCalendarApi (IndexedDB)', () => {
  let api: any;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('calendar_events');
    api = webCalendarApi(db);
  });

  it('creates, retrieves, updates and soft-deletes calendar events', async () => {
    const created = await api.createEvent({
      title: 'Math Study Session',
      start_date: '2026-08-19T14:00:00.000Z',
      end_date: '2026-08-19T15:00:00.000Z',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Math Study Session');

    let events = await api.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe('Math Study Session');

    await api.updateEvent(created.id, { title: 'Math Study Session (Updated)' });
    events = await api.getEvents();
    expect(events[0].title).toBe('Math Study Session (Updated)');

    const deleted = await api.deleteEvent(created.id);
    expect(deleted).toBe(true);

    events = await api.getEvents();
    expect(events).toHaveLength(0);
  });
});
