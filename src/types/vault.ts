export interface VaultGroup {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  itemCount?: number; // Computed on frontend
}

export interface VaultItem {
  id: string;
  group_id: string | null;
  label: string;
  username: string | null;
  email: string | null;
  password: string | null;
  url: string | null;
  notes: string | null;
  custom_fields: string | null; // Serialized JSON string from DB, parsed on frontend
  is_favorite: number; // Stored as integer 0 or 1 in DB
  password_changed_at: string | null;
  password_strength: number; // 0-4 scale
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  groupName?: string; // Virtual joined property
}

export interface VaultCustomField {
  key: string;
  value: string;
  type: 'text' | 'hidden' | 'url';
}

export function isVaultCustomField(value: unknown): value is VaultCustomField {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.key === 'string' &&
    typeof v.value === 'string' &&
    (v.type === 'text' || v.type === 'hidden' || v.type === 'url')
  );
}

export function parseVaultCustomFields(jsonString: string | null | undefined): VaultCustomField[] {
  if (!jsonString) return [];
  try {
    const parsed: unknown = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isVaultCustomField);
  } catch {
    return [];
  }
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

