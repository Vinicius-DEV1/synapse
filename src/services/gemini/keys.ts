import { getWebDb } from '../db-web';
import type { GeminiKeyEntry } from './types';

export async function getGeminiKeys(): Promise<GeminiKeyEntry[]> {
  const db = await getWebDb();
  const doc = await db.get('config', 'geminiApiKeys');
  let keys: GeminiKeyEntry[] | null = doc?.value || null;
  
  if (!keys) {
    keys = [];
  }
  
  // Reactivate keys if disabled time has passed
  let needsSave = false;
  const now = Date.now();
  for (const k of keys) {
    if (k.status === 'exhausted' && k.disabledUntil && k.disabledUntil < now) {
      k.status = 'active';
      k.disabledUntil = undefined;
      needsSave = true;
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
  const keys: GeminiKeyEntry[] = doc?.value || [];
  const target = keys.find(k => k.id === keyId);
  if (target) {
    target.status = status;
    target.disabledUntil = disabledUntil;
    target.errorMessage = errorMessage;
    await db.put('config', {
      id: 'geminiApiKeys',
      value: keys,
      updated_at: new Date().toISOString()
    });
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
