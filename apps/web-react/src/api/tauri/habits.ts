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

export const tauriHabitsApi: IHabitsApi = {
  async getHabits(): Promise<Habit[]> {
    try {
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
