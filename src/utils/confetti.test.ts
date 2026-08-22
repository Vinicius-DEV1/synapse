import { describe, it, expect, vi } from 'vitest';
import { randomInRange, safeConfetti, triggerCelebrationConfetti } from './confetti';

describe('confetti utilities', () => {
  it('randomInRange returns numbers within the given range', () => {
    for (let i = 0; i < 50; i++) {
      const val = randomInRange(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });

  it('safeConfetti handles errors gracefully', () => {
    expect(() => safeConfetti({ particleCount: 10 })).not.toThrow();
  });

  it('triggerCelebrationConfetti returns a cleanup cancellation function', () => {
    vi.useFakeTimers();
    const cancel = triggerCelebrationConfetti({ durationMs: 1000 });
    expect(typeof cancel).toBe('function');
    vi.advanceTimersByTime(500);
    cancel();
    vi.useRealTimers();
  });
});
