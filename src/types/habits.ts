export type HabitColor = 'emerald' | 'indigo' | 'amber' | 'rose' | 'sky' | 'purple';

export interface Habit {
  id: string;
  title: string;
  color?: HabitColor | string;
  icon?: string;
  target_days_per_week?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface HabitLog {
  id: string; // Composite: `${habit_id}_${date}`
  habit_id: string;
  date: string; // Format: 'YYYY-MM-DD'
  completed_at: string;
  notes?: string;
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalCompleted: number;
  completionRate30Days: number;
}

export interface HabitWithLogs {
  habit: Habit;
  logs: HabitLog[];
  stats: HabitStats;
}

export interface IHabitsApi {
  getHabits: () => Promise<Habit[]>;
  getHabit: (id: string) => Promise<Habit | null>;
  createHabit: (data: {
    id?: string;
    title: string;
    color?: string;
    icon?: string;
    target_days_per_week?: number;
  }) => Promise<Habit>;
  updateHabit: (id: string, data: Partial<Habit>) => Promise<{ success: boolean }>;
  deleteHabit: (id: string) => Promise<boolean>;
  getLogs: (habitId: string) => Promise<HabitLog[]>;
  getAllLogs: () => Promise<HabitLog[]>;
  toggleDayLog: (habitId: string, date: string) => Promise<{ completed: boolean; log?: HabitLog }>;
  getHabitWithStats: (habitId: string) => Promise<HabitWithLogs | null>;
}
