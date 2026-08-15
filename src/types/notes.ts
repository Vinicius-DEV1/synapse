export interface Page {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string;
  content?: string;
  crdt_state?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_locked?: number;
  password_salt?: string | null;
  encrypted_content?: string | null;
  is_pinned?: number;
  pinned_order?: number;
  cover_image?: string | null;
  description?: string | null;
}

export type PageMeta = Page;

export interface PageHistoryEntry {
  id: string;
  page_id: string;
  content: string;
  created_at: string;
}
