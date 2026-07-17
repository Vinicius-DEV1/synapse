export const webFocusApi = (db: any, generateId: () => string) => ({
  getSessions: async () => {
    const all = await db.getAll('focus_sessions') || [];
    return all.filter((s: any) => !s.deleted_at).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  createSession: async (session: any) => {
    const id = session.id || generateId();
    const newSession = {
      ...session,
      id,
      created_at: session.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('focus_sessions', newSession);
    return newSession;
  },
  getAlarms: async () => {
    const all = await db.getAll('alarms') || [];
    return all.filter((a: any) => !a.deleted_at);
  },
  createAlarm: async (alarm: any) => {
    const id = alarm.id || Date.now();
    const newAlarm = { 
      ...alarm, 
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null 
    };
    await db.put('alarms', newAlarm);
    return newAlarm;
  },
  updateAlarm: async (id: number, alarm: any) => {
    const existing = await db.get('alarms', id);
    if (!existing) return null;
    const updated = { 
      ...existing, 
      ...alarm,
      updated_at: new Date().toISOString()
    };
    await db.put('alarms', updated);
    return updated;
  },
  deleteAlarm: async (id: number) => {
    const existing = await db.get('alarms', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('alarms', existing);
    }
    return true;
  },
  setAppIcon: async () => {
    // App icon does not apply to web
  }
});
