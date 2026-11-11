import { describe, it, expect } from 'vitest';
import { generateUUID, generateShortId } from './id';

describe('id utils', () => {
  it('generates valid UUID format', () => {
    const id = generateUUID();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('generates unique UUIDs on multiple invocations', () => {
    const set = new Set();
    for (let i = 0; i < 100; i++) {
      set.add(generateUUID());
    }
    expect(set.size).toBe(100);
  });

  it('generates short id with expected length', () => {
    const shortId = generateShortId(6);
    expect(shortId.length).toBeLessThanOrEqual(6);
    expect(typeof shortId).toBe('string');
  });
});
