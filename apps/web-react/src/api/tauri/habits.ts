import { invoke } from '@tauri-apps/api/core';
import type { IHabitsApi, Habit, HabitLog, HabitWithLogs } from '../../types/habits';
import { getWebDb } from '../../services/db-web';
import { webHabitsApi } from '../web/habits';

let fallbackApiPromise: Promise<IHabitsApi> | null = null;
async function getFallbackApi(): Promise<IHabitsApi> {
  if (!fallbackApiPromise) {
    fallbackApiPromise = getWebDb().then((db) => webHabitsApi(db, () => crypto.randomUUID()));
  }
  return fallbackApiPromise;
}

const HABITS_IDB_MIGRATED_KEY = 'caderno_tauri_habits_idb_migrated_v1';
let migrationPromise: Promise<void> | null = null;

async function ensureLegacyIdbHabitsMigrated(): Promise<void> {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(HABITS_IDB_MIGRATED_KEY) === 'true') {
    return;
  }
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      const db = await getWebDb();
      const idbHabits = (await db.getAll('habits')) || [];
      const idbLogs = (await db.getAll('habit_logs')) || [];

      for (const h of idbHabits) {
        if (h && h.id) {
          await invoke('sync_upsert_row', { tableName: 'habits', row: h });
        }
      }
      for (const l of idbLogs) {
        if (l && l.id) {
          await invoke('sync_upsert_row', { tableName: 'habit_logs', row: l });
        }
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(HABITS_IDB_MIGRATED_KEY, 'true');
      }
    } catch (err) {
      console.warn('[tauriHabitsApi] Legacy IndexedDB to SQLite migration skipped:', err);
    }
  })();

  return migrationPromise;
}

export const tauriHabitsApi: IHabitsApi = {
  async getHabits(): Promise<Habit[]> {
    try {
      await ensureLegacyIdbHabitsMigrated();
      return await invoke('habits_get_all');
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getHabits();
    }
  },

  async getHabit(id: string): Promise<Habit | null> {
    try {
      return await invoke('habits_get_by_id', { id });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getHabit(id);
    }
  },

  async createHabit(data: {
    id?: string;
    title: string;
    color?: string;
    icon?: string;
    target_days_per_week?: number;
  }): Promise<Habit> {
    try {
      return await invoke('habits_create', { data });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.createHabit(data);
    }
  },

  async updateHabit(id: string, data: Partial<Habit>): Promise<{ success: boolean }> {
    try {
      return await invoke('habits_update', { id, data });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.updateHabit(id, data);
    }
  },

  async deleteHabit(id: string): Promise<boolean> {
    try {
      return await invoke('habits_delete', { id });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.deleteHabit(id);
    }
  },

  async getLogs(habitId: string): Promise<HabitLog[]> {
    try {
      return await invoke('habits_get_logs', { habitId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getLogs(habitId);
    }
  },

  async getAllLogs(): Promise<HabitLog[]> {
    try {
      return await invoke('habits_get_all_logs');
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getAllLogs();
    }
  },

  async toggleDayLog(habitId: string, date: string): Promise<{ completed: boolean; log?: HabitLog }> {
    try {
      return await invoke('habits_toggle_day_log', { habitId, date });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.toggleDayLog(habitId, date);
    }
  },

  async getHabitWithStats(habitId: string): Promise<HabitWithLogs | null> {
    try {
      return await invoke('habits_get_with_stats', { habitId });
    } catch {
      const fallback = await getFallbackApi();
      return fallback.getHabitWithStats(habitId);
    }
  },
};
