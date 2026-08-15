export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  type: 'event' | 'task';
  status: 'pending' | 'completed';
  color: string;
  recurrence_rule?: string | null;
  reminder_minutes?: number | null;
  page_id?: string | null;
  reminders?: number[];
  notified_reminders?: number[];
  created_at: string;
  updated_at: string;
}
