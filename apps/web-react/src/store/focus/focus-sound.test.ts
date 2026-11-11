import { describe, it, expect, vi } from 'vitest';
import { playAlarmSound, startProceduralAlarm } from './focus-sound';

describe('focus-sound procedural alarms', () => {
  it('playAlarmSound runs without throwing', () => {
    expect(() => playAlarmSound()).not.toThrow();
  });

  it('startProceduralAlarm returns a cleanup function', () => {
    vi.useFakeTimers();
    const mockCtx = {
      currentTime: 0,
      destination: {},
      createGain: () => ({
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      }),
      createOscillator: () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
    } as unknown as AudioContext;

    const stop = startProceduralAlarm(mockCtx, 'beep');
    expect(typeof stop).toBe('function');
    vi.advanceTimersByTime(1000);
    stop();
    vi.useRealTimers();
  });

  it('handles restricted or throwing localStorage gracefully', () => {
    const originalGetItem = localStorage.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure');
    });

    expect(() => playAlarmSound()).not.toThrow();

    const mockCtx = {
      currentTime: 0,
      destination: {},
      createGain: () => ({
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      }),
      createOscillator: () => ({
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
    } as unknown as AudioContext;

    expect(() => startProceduralAlarm(mockCtx, 'beep')).not.toThrow();

    Storage.prototype.getItem = originalGetItem;
  });
});
