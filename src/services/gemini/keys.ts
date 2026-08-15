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
