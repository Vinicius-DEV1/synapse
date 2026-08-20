import { describe, it, expect } from 'vitest';
import { getGeminiKeys, saveGeminiKeys } from './keys';
import type { GeminiKeyEntry } from './types';

describe('gemini keys service', () => {
  it('saves and retrieves gemini keys from database', async () => {
    const testKeys: GeminiKeyEntry[] = [
      {
        id: 'key-1',
        key: 'AIzaSyTestKey123',
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ];

    await saveGeminiKeys(testKeys);
    const retrieved = await getGeminiKeys();

    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].key).toBe('AIzaSyTestKey123');
    expect(retrieved[0].status).toBe('active');
  });

  it('reactivates exhausted keys when disabledUntil timestamp has passed', async () => {
    const expiredKey: GeminiKeyEntry = {
      id: 'key-exhausted',
      key: 'AIzaSyExhaustedPast',
      status: 'exhausted',
      disabledUntil: Date.now() - 10000, // in the past
      created_at: new Date().toISOString(),
    };

    await saveGeminiKeys([expiredKey]);
    const retrieved = await getGeminiKeys();

    expect(retrieved[0].status).toBe('active');
    expect(retrieved[0].disabledUntil).toBeUndefined();
  });
});
