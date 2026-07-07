export interface LofiItem {
  id: string;
  title: string;
  original_name: string;
  duration?: number;
  file_path?: string;
  drive_file_id?: string;
  is_local: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
