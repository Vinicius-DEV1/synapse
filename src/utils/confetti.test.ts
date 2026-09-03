import { describe, it, expect, vi } from 'vitest';
import {
  randomInRange,
  safeConfetti,
  triggerCelebrationConfetti,
  stopCelebrationConfetti,
} from './confetti';

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

  it('stopCelebrationConfetti stops active celebration safely', () => {
    vi.useFakeTimers();
    triggerCelebrationConfetti({ durationMs: 2000 });
    expect(() => stopCelebrationConfetti()).not.toThrow();
    vi.advanceTimersByTime(2500);
    vi.useRealTimers();
  });

  it('triggerCelebrationConfetti automatically stops previous ongoing celebration', () => {
    vi.useFakeTimers();
    const cancel1 = triggerCelebrationConfetti({ durationMs: 2000 });
    // Calling triggerCelebrationConfetti again cancels the first one automatically
    const cancel2 = triggerCelebrationConfetti({ durationMs: 1000 });
    expect(typeof cancel2).toBe('function');
    cancel2();
    vi.useRealTimers();
  });
});

