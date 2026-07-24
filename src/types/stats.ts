export interface ActivityLog {
  id: string;
  module: 'lofi' | 'video' | 'library';
  item_id: string;
  item_title: string;
  duration_seconds: number;
  date: string; // YYYY-MM-DD for easier grouping
  created_at: string;
  updated_at: string;
}
