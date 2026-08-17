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
