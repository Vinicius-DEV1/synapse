import { describe, it, expect } from 'vitest';
import { LruMap } from './lru-cache';

describe('LruMap', () => {
  it('evicts the oldest entry when exceeding maxEntries', () => {
    const lru = new LruMap<string, number>(3);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.set('c', 3);

    expect(lru.size).toBe(3);
    expect(Array.from(lru.keys())).toEqual(['a', 'b', 'c']);

    // Adding fourth entry should evict 'a'
    lru.set('d', 4);
    expect(lru.size).toBe(3);
    expect(lru.has('a')).toBe(false);
    expect(Array.from(lru.keys())).toEqual(['b', 'c', 'd']);
  });

  it('refreshes recency when re-setting existing key', () => {
    const lru = new LruMap<string, number>(3);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.set('c', 3);

    // Re-set 'a' to make it most recent
    lru.set('a', 10);
    expect(Array.from(lru.keys())).toEqual(['b', 'c', 'a']);

    // Next insertion should evict 'b' (oldest) instead of 'a'
    lru.set('d', 4);
    expect(lru.has('b')).toBe(false);
    expect(lru.has('a')).toBe(true);
    expect(lru.get('a')).toBe(10);
  });
});
