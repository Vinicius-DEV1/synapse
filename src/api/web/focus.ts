export const webFocusApi = (db: any, generateId: () => string) => ({
  getSessions: async () => {
    const all = await db.getAll('focus_sessions') || [];
    return all.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  createSession: async (session: any) => {
    const id = session.id || generateId();
    const newSession = {
      ...session,
      id,
      created_at: session.created_at || new Date().toISOString()
    };
    await db.put('focus_sessions', newSession);
    return newSession;
  },
  getAlarms: async () => {
    const all = await db.getAll('focus_alarms') || [];
    return all;
  },
  createAlarm: async (alarm: any) => {
    const id = alarm.id || Date.now();
    const newAlarm = { ...alarm, id };
    await db.put('focus_alarms', newAlarm);
    return newAlarm;
  },
  updateAlarm: async (id: number, alarm: any) => {
    const existing = await db.get('focus_alarms', id);
    if (!existing) return null;
    const updated = { ...existing, ...alarm };
    await db.put('focus_alarms', updated);
    return updated;
  },
  deleteAlarm: async (id: number) => {
    await db.delete('focus_alarms', id);
    return true;
  },
  setAppIcon: async () => {
    // App icon does not apply to web
  }
});
