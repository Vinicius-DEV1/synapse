export interface Session {
  id?: number;
  tag: string;
  description: string;
  target_time_minutes: number;
  status: 'completed' | 'cancelled';
  justification?: string | null;
  summary?: string | null;
  created_at?: string;
}

export interface Stats {
  totalSessions: number;
  totalTime: number;
  completed: number;
  cancelled: number;
}

export interface Alarm {
  id?: number;
  time_str: string;
  label?: string | null;
  is_active: boolean | number;
  created_at?: string;
}

declare global {
  interface Window {
    api: {
      getSessions: () => Promise<Session[]>;
      getStats: () => Promise<Stats>;
      saveSession: (session: Session) => Promise<number>;
      deleteSessions: (filter: { type: 'today' | 'last7days' | 'all' | 'specific', id?: number }) => Promise<number>;
      getAlarms: () => Promise<Alarm[]>;
      saveAlarm: (alarm: Alarm) => Promise<number>;
      toggleAlarm: (id: number, isActive: boolean) => Promise<number>;
      deleteAlarm: (id: number) => Promise<number>;
      setAppIcon?: (type: 'normal' | 'zzz') => Promise<void>;
    };
  }
}
