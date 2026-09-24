import type { Habit, HabitLog, HabitWithLogs, IHabitsApi } from '../../types/habits';
import { calculateHabitStreak } from '../../utils/habitUtils';

export const webHabitsApi = (db: any, generateId: () => string = () => crypto.randomUUID()): IHabitsApi => ({
  getHabits: async (): Promise<Habit[]> => {
    const all = (await db.getAll('habits')) || [];
    return all
      .filter((h: Habit) => !h.deleted_at)
      .sort((a: Habit, b: Habit) => a.title.localeCompare(b.title));
  },

  getHabit: async (id: string): Promise<Habit | null> => {
    const habit = await db.get('habits', id);
    if (!habit || habit.deleted_at) return null;
    return habit;
  },

  createHabit: async (data: {
    id?: string;
    title: string;
    color?: string;
    icon?: string;
    target_days_per_week?: number;
  }): Promise<Habit> => {
    const id = data.id && data.id !== '' ? data.id : generateId();
    const now = new Date().toISOString();
    const newHabit: Habit = {
      id,
      title: data.title.trim(),
      color: data.color || 'emerald',
      icon: data.icon || 'Flame',
      target_days_per_week: data.target_days_per_week || 7,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await db.put('habits', newHabit);
    return newHabit;
  },

  updateHabit: async (id: string, data: Partial<Habit>): Promise<{ success: boolean }> => {
    const existing = await db.get('habits', id);
    if (!existing) return { success: false };
    const updated: Habit = {
      ...existing,
      ...data,
      id, // Preserve ID
      updated_at: new Date().toISOString(),
    };
    await db.put('habits', updated);
    return { success: true };
  },

  deleteHabit: async (id: string): Promise<boolean> => {
    const existing = await db.get('habits', id);
    if (!existing) return false;
    existing.deleted_at = new Date().toISOString();
    existing.updated_at = new Date().toISOString();
    await db.put('habits', existing);
    return true;
  },

  getLogs: async (habitId: string): Promise<HabitLog[]> => {
    const allLogs: HabitLog[] = (await db.getAll('habit_logs')) || [];
    return allLogs
      .filter((l) => l.habit_id === habitId)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getAllLogs: async (): Promise<HabitLog[]> => {
    return (await db.getAll('habit_logs')) || [];
  },

  toggleDayLog: async (habitId: string, date: string): Promise<{ completed: boolean; log?: HabitLog }> => {
    const compositeKey = `${habitId}_${date}`;
    const existing = await db.get('habit_logs', compositeKey);

    if (existing) {
      await db.delete('habit_logs', compositeKey);
      return { completed: false };
    }

    const newLog: HabitLog = {
      id: compositeKey,
      habit_id: habitId,
      date,
      completed_at: new Date().toISOString(),
    };
    await db.put('habit_logs', newLog);
    return { completed: true, log: newLog };
  },

  getHabitWithStats: async (habitId: string): Promise<HabitWithLogs | null> => {
    const habit = await db.get('habits', habitId);
    if (!habit || habit.deleted_at) return null;

    const allLogs: HabitLog[] = (await db.getAll('habit_logs')) || [];
    const logs = allLogs
      .filter((l) => l.habit_id === habitId)
      .sort((a, b) => a.date.localeCompare(b.date));

    const stats = calculateHabitStreak(logs);

    return {
      habit,
      logs,
      stats,
    };
  },
});
