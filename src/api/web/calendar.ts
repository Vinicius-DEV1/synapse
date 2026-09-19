export const webCalendarApi = (db: any) => ({
  getEvents: async () => {
    const all = await db.getAll('calendar_events') || [];
    return all.filter((e: any) => !e.deleted_at);
  },
  getEvent: async (id: string) => {
    const existing = await db.get('calendar_events', id);
    if (!existing || existing.deleted_at) return null;
    return existing;
  },
  createEvent: async (event: any) => {
    const id = (event.id && event.id !== '') ? event.id : crypto.randomUUID();
    const newEvent = {
      ...event,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('calendar_events', newEvent);
    return newEvent;
  },
  updateEvent: async (id: string, event: any) => {
    const existing = await db.get('calendar_events', id);
    if (!existing) return { success: false };
    const updated = { ...existing, ...event, updated_at: new Date().toISOString() };
    await db.put('calendar_events', updated);
    return { success: true };
  },
  deleteEvent: async (id: string) => {
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
