import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGarbageCollection } from './useGarbageCollection';
import * as imageGc from '../services/image-gc';

vi.mock('../services/image-gc', () => ({
  runImageGarbageCollector: vi.fn().mockResolvedValue(undefined),
}));

describe('useGarbageCollection Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs garbage collection when isAuth is true and last run was > 7 days ago', async () => {
    renderHook(() => useGarbageCollection(true));

    // Allow dynamic import to resolve
    await vi.waitFor(() => {
      expect(imageGc.runImageGarbageCollector).toHaveBeenCalledTimes(1);
    });

    expect(localStorage.getItem('last_gc_run')).toBeDefined();
  });

  it('skips garbage collection if last run was less than 7 days ago', async () => {
    const recentTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    localStorage.setItem('last_gc_run', recentTime.toString());

    renderHook(() => useGarbageCollection(true));

    // Wait a bit to ensure it is not called
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(imageGc.runImageGarbageCollector).not.toHaveBeenCalled();
  });

  it('does nothing when isAuth is false', async () => {
    renderHook(() => useGarbageCollection(false));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(imageGc.runImageGarbageCollector).not.toHaveBeenCalled();
  });
});
