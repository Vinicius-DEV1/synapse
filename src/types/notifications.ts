export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'calendar_event' | 'alarm' | 'system';
  target_page_id?: string | null;
  event_id?: string | null;
  scheduled_for?: string | null;
  fired_at: string;
  is_read: boolean;
  created_at: string;
}
