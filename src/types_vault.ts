export interface VaultGroup {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  itemCount?: number; // calculado no frontend
}

export interface VaultItem {
  id: string;
  group_id: string;
  label: string;
  username: string | null;
  email: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  custom_fields: string | null; // JSON string from DB, we will parse it in frontend
  is_favorite: number; // in DB it's integer 0/1
  password_changed_at: string | null;
  password_strength: number; // 0-4
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  groupName?: string; // join virtual
}

export interface VaultCustomField {
  key: string;
  value: string;
  type: 'text' | 'hidden' | 'url';
}

export interface VaultPasswordHistoryEntry {
  id: string;
  item_id: string;
  password: string;
  changed_at: string;
  deleted_at: string | null;
}

export interface PasswordGenOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

export interface BreachCheckResult {
  breached: boolean;
  count: number;
}
