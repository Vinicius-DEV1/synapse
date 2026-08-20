import { describe, it, expect } from 'vitest';
import { PayloadOptimizer } from './PayloadOptimizer';

describe('PayloadOptimizer', () => {
  it('handles primitive values correctly', () => {
    expect(PayloadOptimizer.optimize('text')).toBe('text');
    expect(PayloadOptimizer.optimize(123)).toBe(123);
    expect(PayloadOptimizer.optimize(true)).toBe(true);
    expect(PayloadOptimizer.optimize(null)).toBe(null);
    expect(PayloadOptimizer.optimize(undefined)).toBe(undefined);
  });

  it('preserves Date, Uint8Array and ArrayBuffer instances untouched', () => {
    const d = new Date('2026-08-19');
    const u = new Uint8Array([1, 2, 3]);
    const b = new ArrayBuffer(8);

    expect(PayloadOptimizer.optimize(d)).toBe(d);
    expect(PayloadOptimizer.optimize(u)).toBe(u);
    expect(PayloadOptimizer.optimize(b)).toBe(b);
  });

  it('recursively strips undefined properties from objects', () => {
    const input = {
      name: 'Caderno',
      age: undefined,
      nested: {
        valid: true,
        extra: undefined,
        deep: {
          val: 'hello',
          removed: undefined,
        },
      },
    };

    const output = PayloadOptimizer.optimize(input);
    expect(output).toEqual({
      name: 'Caderno',
      nested: {
        valid: true,
        deep: {
          val: 'hello',
        },
      },
    });
  });

  it('filters undefined elements from arrays and optimizes array items', () => {
    const input = [
      { a: 1, b: undefined },
      undefined,
      { c: 3, d: null },
    ];

    const output = PayloadOptimizer.optimize(input);
    expect(output).toEqual([
      { a: 1 },
      { c: 3, d: null },
    ]);
  });
});
