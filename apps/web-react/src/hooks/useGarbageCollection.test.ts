import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGarbageCollection } from './useGarbageCollection';
import * as imageGc from '../services/image-gc';
import * as linkGc from '../services/link-vault/link-gc';

vi.mock('../services/image-gc', () => ({
  runImageGarbageCollector: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/link-vault/link-gc', () => ({
  runLinkGarbageCollector: vi.fn().mockResolvedValue({ activeCount: 0, orphanedCount: 0, purgedCount: 0 }),
}));

describe('useGarbageCollection Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('defers garbage collection after boot and runs when > 7 days elapsed', async () => {
    renderHook(() => useGarbageCollection(true));

    // Must NOT execute synchronously on boot
    expect(imageGc.runImageGarbageCollector).not.toHaveBeenCalled();
    expect(linkGc.runLinkGarbageCollector).not.toHaveBeenCalled();

    // Advance past 30s boot defer + fallback idle timer
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31_000);
    });

    expect(imageGc.runImageGarbageCollector).toHaveBeenCalledTimes(1);
    expect(linkGc.runLinkGarbageCollector).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('last_gc_run')).toBeDefined();
  });

  it('skips garbage collection if last run was less than 7 days ago', async () => {
    const recentTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    localStorage.setItem('last_gc_run', recentTime.toString());

    renderHook(() => useGarbageCollection(true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });

    expect(imageGc.runImageGarbageCollector).not.toHaveBeenCalled();
  });

  it('does nothing when isAuth is false', async () => {
    renderHook(() => useGarbageCollection(false));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(35_000);
    });

    expect(imageGc.runImageGarbageCollector).not.toHaveBeenCalled();
  });
});
