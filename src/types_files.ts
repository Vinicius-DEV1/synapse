export const __TypesFiles = true;

export interface FileItem {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  local_path: string | null;
  drive_file_id: string | null;
  folder_id: string | null;
  mime_type: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface FileFolder {
  id: string;
  name: string;
  parent_id: string | null;
  color: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface FilePageLink {
  id: string;
  file_id: string;
  page_id: string;
  link_type: string; // 'upload' | 'link'
  widget_id: string | null;
  created_at?: string;
  deleted_at?: string | null;
}
