import { getWebDb } from '../db-web';
import type { GeminiKeyEntry } from './types';

export function isConfirmedKeyRevocation(errorMessage?: string): boolean {
  if (!errorMessage) return false;
  const msg = errorMessage.toLowerCase();
  return (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('key not valid') ||
    msg.includes('invalid api key') ||
    msg.includes('permission_denied') ||
    msg.includes('permission denied') ||
    msg.includes('consumer_suspended') ||
    msg.includes('revogada') ||
    msg.includes('revoked') ||
    msg.includes('403')
  );
}

export function normalizeKeyEntries(raw: unknown): { keys: GeminiKeyEntry[]; needsSave: boolean } {
  let needsSave = false;
  const result: GeminiKeyEntry[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item) continue;
      if (typeof item === 'string' && item.trim().length > 0) {
        result.push({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2, 6),
          key: item.trim(),
          status: 'active',
          addedAt: Date.now(),
        });
        needsSave = true;
      } else if (typeof item === 'object' && 'key' in item && typeof (item as { key: unknown }).key === 'string') {
        const entry = item as Partial<GeminiKeyEntry>;
        result.push({
          id: entry.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2, 6)),
          key: entry.key!.trim(),
          status: entry.status === 'exhausted' || entry.status === 'error' ? entry.status : 'active',
          disabledUntil: typeof entry.disabledUntil === 'number' ? entry.disabledUntil : undefined,
          addedAt: typeof entry.addedAt === 'number' ? entry.addedAt : Date.now(),
          errorMessage: typeof entry.errorMessage === 'string' ? entry.errorMessage : undefined,
        });
      }
    }
  } else if (typeof raw === 'string' && raw.trim().length > 0) {
    result.push({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      key: raw.trim(),
      status: 'active',
      addedAt: Date.now(),
    });
    needsSave = true;
  } else if (raw && typeof raw === 'object' && 'key' in raw && typeof (raw as { key: unknown }).key === 'string') {
    const entry = raw as Partial<GeminiKeyEntry>;
    result.push({
      id: entry.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
      key: entry.key!.trim(),
      status: entry.status === 'exhausted' || entry.status === 'error' ? entry.status : 'active',
      disabledUntil: typeof entry.disabledUntil === 'number' ? entry.disabledUntil : undefined,
      addedAt: typeof entry.addedAt === 'number' ? entry.addedAt : Date.now(),
      errorMessage: typeof entry.errorMessage === 'string' ? entry.errorMessage : undefined,
    });
    needsSave = true;
  }

  // Fallback: Check localStorage if no keys found
  if (result.length === 0 && typeof window !== 'undefined' && window.localStorage) {
    try {
      const lsKey = window.localStorage.getItem('geminiApiKey');
      if (lsKey && lsKey.trim().length > 0) {
        result.push({
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          key: lsKey.trim(),
          status: 'active',
          addedAt: Date.now(),
        });
        needsSave = true;
      }
    } catch (err: unknown) {
      console.debug('[GeminiKeys] Unable to read fallback key from localStorage:', err);
    }
  }

  return { keys: result, needsSave };
}

export async function getGeminiKeys(): Promise<GeminiKeyEntry[]> {
  const db = await getWebDb();
  const doc = await db.get('config', 'geminiApiKeys');
  const { keys, needsSave: initialNeedsSave } = normalizeKeyEntries(doc?.value);
  let needsSave = initialNeedsSave;
  
  // Reactivate keys if disabled time has passed or if falsely marked as error
  const now = Date.now();
  for (const k of keys) {
    if (k.status === 'exhausted' && k.disabledUntil && k.disabledUntil < now) {
      k.status = 'active';
      k.disabledUntil = undefined;
      needsSave = true;
    }

    // Auto-heal keys that were falsely marked as 'error' due to payload/400 errors
    if (k.status === 'error' && !isConfirmedKeyRevocation(k.errorMessage)) {
      k.status = 'active';
      k.errorMessage = undefined;
      k.disabledUntil = undefined;
      needsSave = true;
    }
  }

  // Safety net: if all keys are currently inactive but some are not confirmed revoked, reactivate them
  if (keys.length > 0 && keys.every(k => k.status !== 'active')) {
    for (const k of keys) {
      if (!isConfirmedKeyRevocation(k.errorMessage)) {
        k.status = 'active';
        k.errorMessage = undefined;
        k.disabledUntil = undefined;
        needsSave = true;
      }
    }
  }
  
  if (needsSave) {
    await saveGeminiKeys(keys);
  }
  
  return keys;
}

export async function saveGeminiKeys(keys: GeminiKeyEntry[]): Promise<void> {
  const db = await getWebDb();
  await db.put('config', {
    id: 'geminiApiKeys',
    value: keys,
    updated_at: new Date().toISOString()
  });
}

/**
 * Updates status of a specific API key directly in storage with fresh state.
 * Prevents race conditions from stale concurrent memory references.
 */
export async function updateGeminiKeyStatus(
  keyId: string,
  status: 'active' | 'exhausted' | 'error',
  disabledUntil?: number,
  errorMessage?: string
): Promise<void> {
  const db = await getWebDb();
  const doc = await db.get('config', 'geminiApiKeys');
  const { keys } = normalizeKeyEntries(doc?.value);
  const target = keys.find(k => k.id === keyId);
  if (target) {
    target.status = status;
    target.disabledUntil = disabledUntil;
    target.errorMessage = errorMessage;
    await saveGeminiKeys(keys);
  }
}

let keyRotationIndex = 0;

/**
 * Returns active keys rotated round-robin across invocations.
 * Evenly distributes request load across the pool to avoid 15 RPM throttling on key #0.
 */
export function getRotatedActiveKeys(keys: GeminiKeyEntry[]): GeminiKeyEntry[] {
  const active = keys.filter(k => k.status === 'active');
  if (active.length <= 1) return active;
  const offset = keyRotationIndex % active.length;
  keyRotationIndex = (keyRotationIndex + 1) % active.length;
  return [...active.slice(offset), ...active.slice(0, offset)];
}

/** Resets round-robin index (useful in tests) */
export function resetKeyRotationIndex(): void {
  keyRotationIndex = 0;
}
