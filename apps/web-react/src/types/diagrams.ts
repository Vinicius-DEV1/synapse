export interface DiagramMeta {
  id: string;
  title: string;
  icon: string;
  created_at?: string;
  updated_at?: string;
}

export interface DiagramContent {
  content: string;
  encrypted_content?: string | null;
}

export interface DiagramRecord {
  id: string;
  title: string;
  icon: string;
  content: string;
  encrypted_content?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}
