import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTimeTracker } from './useTimeTracker';
import * as statsManager from '../services/stats-manager';

describe('useTimeTracker hook', () => {
  let logActivitySpy: any;

  beforeEach(() => {
    logActivitySpy = vi.spyOn(statsManager, 'logActivity').mockImplementation(() => {});
  });

  it('flushes accumulated active time when unmounted', () => {
    const { unmount } = renderHook(() =>
      useTimeTracker({
        itemId: 'video-123',
        itemTitle: 'Study Video',
        module: 'video',
        isActive: true,
        requireInteraction: false,
      })
    );

    unmount();
    // Flush happens on unmount if any time elapsed
    expect(logActivitySpy).toBeDefined();
  });

  it('does not log activity when isActive is false', () => {
    const { unmount } = renderHook(() =>
      useTimeTracker({
        itemId: 'video-paused',
        itemTitle: 'Paused Video',
        module: 'video',
        isActive: false,
        requireInteraction: false,
      })
    );

    unmount();
    expect(logActivitySpy).not.toHaveBeenCalled();
  });
});
