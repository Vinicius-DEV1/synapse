import { sqliteGetAll, sqliteQuery } from './bridgeClient';

export const webviewFocusApi = {
  async getSessions() {
    return await sqliteGetAll(`SELECT * FROM focus_sessions ORDER BY created_at DESC`);
  },

  async createSession(session: any) {
    const id = session.id || `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const newSession = {
      id,
      tag: session.tag || 'Trabalho',
      description: session.description || '',
      target_time_minutes: session.target_time_minutes || 25,
      status: session.status || 'completed',
      justification: session.justification || '',
      summary: session.summary || '',
      created_at: session.created_at || now,
    };

    await sqliteQuery(
      `INSERT INTO focus_sessions (id, tag, description, target_time_minutes, status, justification, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newSession.id,
        newSession.tag,
        newSession.description,
        newSession.target_time_minutes,
        newSession.status,
        newSession.justification,
        newSession.summary,
        newSession.created_at,
      ]
    );

    return newSession;
  },

  async getAlarms() {
    const rows = await sqliteGetAll<any>(`SELECT * FROM alarms`);
    return rows.map((r) => ({
      ...r,
      enabled: Boolean(r.enabled),
      days: r.days ? (typeof r.days === 'string' ? JSON.parse(r.days) : r.days) : [],
    }));
  },

  async createAlarm(alarm: any) {
    const id = alarm.id || `alarm_${Date.now()}`;
    await sqliteQuery(
      `INSERT INTO alarms (id, time, label, sound, enabled, days) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        alarm.time,
        alarm.label || '',
        alarm.sound || 'bell',
        alarm.enabled ? 1 : 0,
        JSON.stringify(alarm.days || []),
      ]
    );
    return { id, ...alarm };
  },

  async updateAlarm(alarm: any) {
    await sqliteQuery(
      `UPDATE alarms SET time = ?, label = ?, sound = ?, enabled = ?, days = ? WHERE id = ?`,
      [
        alarm.time,
        alarm.label,
        alarm.sound,
        alarm.enabled ? 1 : 0,
        JSON.stringify(alarm.days || []),
        alarm.id,
      ]
    );
    return true;
  },

  async deleteAlarm(id: string) {
    await sqliteQuery(`DELETE FROM alarms WHERE id = ?`, [id]);
    return true;
  },
};
