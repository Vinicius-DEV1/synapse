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
      addedAt: Date.now() - 20000,
    };

    await saveGeminiKeys([expiredKey]);
    const retrieved = await getGeminiKeys();

    expect(retrieved[0].status).toBe('active');
    expect(retrieved[0].disabledUntil).toBeUndefined();
  });

  it('updates key status atomically via updateGeminiKeyStatus', async () => {
    const initialKey: GeminiKeyEntry = {
      id: 'key-update-test',
      key: 'AIzaSyUpdateKey',
      status: 'active',
      addedAt: Date.now(),
    };

    await saveGeminiKeys([initialKey]);
    const { updateGeminiKeyStatus } = await import('./keys');

    await updateGeminiKeyStatus('key-update-test', 'error', undefined, 'Chave revogada (403)');
    const retrieved = await getGeminiKeys();

    expect(retrieved[0].status).toBe('error');
    expect(retrieved[0].errorMessage).toBe('Chave revogada (403)');
  });

  it('rotates active keys round-robin across calls via getRotatedActiveKeys', async () => {
    const { getRotatedActiveKeys, resetKeyRotationIndex } = await import('./keys');
    resetKeyRotationIndex();

    const keys: GeminiKeyEntry[] = [
      { id: 'k1', key: 'key-1', status: 'active', addedAt: 1 },
      { id: 'k2', key: 'key-2', status: 'active', addedAt: 2 },
      { id: 'k3', key: 'key-3', status: 'active', addedAt: 3 },
      { id: 'k4', key: 'key-4', status: 'exhausted', addedAt: 4 },
    ];

    const pass1 = getRotatedActiveKeys(keys);
    expect(pass1.map((k) => k.id)).toEqual(['k1', 'k2', 'k3']);

    const pass2 = getRotatedActiveKeys(keys);
    expect(pass2.map((k) => k.id)).toEqual(['k2', 'k3', 'k1']);

    const pass3 = getRotatedActiveKeys(keys);
    expect(pass3.map((k) => k.id)).toEqual(['k3', 'k1', 'k2']);

    const pass4 = getRotatedActiveKeys(keys);
    expect(pass4.map((k) => k.id)).toEqual(['k1', 'k2', 'k3']);
  });
});
