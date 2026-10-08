import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import type { Session, Alarm } from '../../components/focus/types';

export interface DeleteSessionsOptions {
  type: 'specific' | 'all' | 'today' | 'last7days';
  id?: number | string;
}

export const webFocusApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) => ({
  getSessions: async (): Promise<Session[]> => {
    const all = (await db.getAll('focus_sessions')) || [];
    return all
      .filter((s): s is Session => !s.deleted_at)
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
  },

  createSession: async (session: Partial<Session>): Promise<Session> => {
    const id = session.id ? String(session.id) : generateId();
    const newSession: Session = {
      tag: session.tag || '',
      description: session.description || '',
      target_time_minutes: session.target_time_minutes || 0,
      status: session.status || 'completed',
      justification: session.justification ?? null,
      summary: session.summary ?? null,
      ...session,
      id,
      created_at: session.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    await db.put('focus_sessions', newSession);
    return newSession;
  },

  deleteSessions: async (options?: DeleteSessionsOptions): Promise<{ success: boolean; error?: string }> => {
    try {
      const all = (await db.getAll('focus_sessions')) || [];
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
      const nowIso = now.toISOString();

      for (const session of all) {
        if (session.deleted_at) continue;

        let shouldDelete = false;
        if (!options || options.type === 'all') {
          shouldDelete = true;
        } else if (options.type === 'specific') {
          shouldDelete = String(session.id) === String(options.id);
        } else if (options.type === 'today') {
          const sessionTime = session.created_at ? new Date(session.created_at).getTime() : 0;
          shouldDelete = sessionTime >= startOfToday;
        } else if (options.type === 'last7days') {
          const sessionTime = session.created_at ? new Date(session.created_at).getTime() : 0;
          shouldDelete = sessionTime >= sevenDaysAgo;
        }

        if (shouldDelete) {
          session.deleted_at = nowIso;
          session.updated_at = nowIso;
          await db.put('focus_sessions', session);
        }
      }
      return { success: true };
    } catch (err: unknown) {
      console.error('[webFocusApi] deleteSessions failed:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  },

  getAlarms: async (): Promise<Alarm[]> => {
    const all = (await db.getAll('alarms')) || [];
    return all.filter((a): a is Alarm => !a.deleted_at);
  },

  createAlarm: async (alarm: Partial<Alarm>): Promise<Alarm> => {
    const id = typeof alarm.id === 'number' ? alarm.id : Date.now();
    const newAlarm: Alarm = {
      time_str: alarm.time_str || '00:00',
      label: alarm.label ?? null,
      is_active: alarm.is_active ?? true,
      ...alarm,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    await db.put('alarms', newAlarm);
    return newAlarm;
  },

  updateAlarm: async (id: number, alarm: Partial<Alarm>): Promise<Alarm | null> => {
    const existing = await db.get('alarms', id);
    if (!existing) return null;
    const updated: Alarm = {
      ...existing,
      ...alarm,
      updated_at: new Date().toISOString(),
    };
    await db.put('alarms', updated);
    return updated;
  },

  deleteAlarm: async (id: number): Promise<boolean> => {
    const existing = await db.get('alarms', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('alarms', existing);
    }
    return true;
  },

  setAppIcon: async (): Promise<void> => {
    // App icon does not apply to web
  },
});
