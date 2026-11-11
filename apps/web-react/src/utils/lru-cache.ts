/**
 * LruMap is a lightweight Map subclass providing O(1) LRU eviction.
 * When the number of entries exceeds `maxEntries`, the oldest entry is evicted.
 */
export class LruMap<K, V> extends Map<K, V> {
  private readonly maxEntries: number;

  constructor(maxEntries: number = 30) {
    super();
    this.maxEntries = Math.max(1, maxEntries);
  }

  override set(key: K, value: V): this {
    super.delete(key);
    super.set(key, value);

    if (this.size > this.maxEntries) {
      const oldestKey = this.keys().next().value;
      if (oldestKey !== undefined) {
        super.delete(oldestKey);
      }
    }
    return this;
  }
}
