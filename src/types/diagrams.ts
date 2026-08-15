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
