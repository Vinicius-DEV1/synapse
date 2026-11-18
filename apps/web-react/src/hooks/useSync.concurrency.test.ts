import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSync } from './useSync';
import * as syncService from '../services/sync';

vi.mock('../services/firebase', () => ({
  auth: { currentUser: { uid: 'sync-test-user', isAnonymous: false } },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(
    (
      _auth: unknown,
      callback: (user: { uid: string; isAnonymous: boolean }) => void,
    ) => {
      callback({ uid: 'sync-test-user', isAnonymous: false });
      return vi.fn();
    },
  ),
}));

vi.mock('../services/sync', () => ({
  pullAllFromCloud: vi.fn().mockResolvedValue(undefined),
  pushAllToCloud: vi.fn().mockResolvedValue(undefined),
  syncPdfsToCloud: vi.fn().mockResolvedValue(undefined),
  listenForCloudSyncSignal: vi.fn(() => () => {}),
}));

class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(name: string) {
    this.name = name;
  }
  postMessage = vi.fn();
  close = vi.fn();
}

(globalThis as unknown as { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel = MockBroadcastChannel;

const mockMasterKeys: Record<string, CryptoKey> = {
  core: {} as CryptoKey,
  notes: {} as CryptoKey,
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useSync concurrency safeguards', () => {
  it('keeps the mutex until a timed-out pull settles before draining queued signals', async () => {
    let signalCallback: ((signalDeviceId?: string) => void) | null = null;
    vi.mocked(syncService.listenForCloudSyncSignal).mockImplementation((callback) => {
      signalCallback = callback;
      callback('initial-snapshot');
      return () => {};
    });

    let resolveInitialPull: () => void = () => {};
    const initialPull = new Promise<void>((resolve) => {
      resolveInitialPull = resolve;
    });
    let resolveQueuedPull: () => void = () => {};
    const queuedPull = new Promise<void>((resolve) => {
      resolveQueuedPull = resolve;
    });
    vi.mocked(syncService.pullAllFromCloud)
      .mockImplementationOnce(() => initialPull)
      .mockImplementationOnce(() => queuedPull);
    const loadPages = vi.fn();
    vi.useFakeTimers();

    const { result, unmount } = renderHook(() => useSync(true, mockMasterKeys, loadPages));

    try {
      await act(async () => {
        await Promise.resolve();
      });
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);

      await act(async () => {
        vi.advanceTimersByTime(120_000);
        for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
      });
      expect(result.current.syncStatus).toBe('error');

      await act(async () => {
        signalCallback?.('remote-device');
      });
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveInitialPull();
        await Promise.resolve();
      });
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(2);
      expect(loadPages).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
      await act(async () => {
        resolveQueuedPull();
      });
      vi.useRealTimers();
    }
  });

  it('waits for both full-sync tasks to settle before releasing the mutex after a failure', async () => {
    let signalCallback: ((signalDeviceId?: string) => void) | null = null;
    vi.mocked(syncService.listenForCloudSyncSignal).mockImplementation((callback) => {
      signalCallback = callback;
      callback('initial-snapshot');
      return () => {};
    });

    let resolvePdfSync: () => void = () => {};
    const pendingPdfSync = new Promise<void>((resolve) => {
      resolvePdfSync = resolve;
    });
    vi.mocked(syncService.pushAllToCloud).mockRejectedValueOnce(new Error('push failed'));
    vi.mocked(syncService.syncPdfsToCloud).mockImplementationOnce(() => pendingPdfSync);

    const loadPages = vi.fn();
    const { unmount } = renderHook(() => useSync(true, mockMasterKeys, loadPages));

    try {
      await vi.waitFor(() => {
        expect(syncService.syncPdfsToCloud).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        signalCallback?.('remote-device');
      });
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolvePdfSync();
      });
      await vi.waitFor(() => {
        expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(2);
      });
    } finally {
      unmount();
    }
  });

  it('does not load pages when a pull finishes after the hook unmounts', async () => {
    let resolveInitialPull: () => void = () => {};
    const initialPull = new Promise<void>((resolve) => {
      resolveInitialPull = resolve;
    });
    vi.mocked(syncService.pullAllFromCloud).mockImplementationOnce(() => initialPull);

    const loadPages = vi.fn();
    const { unmount } = renderHook(() => useSync(true, mockMasterKeys, loadPages));

    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);
    });
    unmount();

    await act(async () => {
      resolveInitialPull();
      await Promise.resolve();
    });
    expect(loadPages).not.toHaveBeenCalled();
  });

  it('serializes a new workspace sync behind an operation from the previous effect', async () => {
    let resolvePreviousPull: () => void = () => {};
    const previousPull = new Promise<void>((resolve) => {
      resolvePreviousPull = resolve;
    });
    vi.mocked(syncService.pullAllFromCloud).mockImplementationOnce(() => previousPull);

    const previousLoadPages = vi.fn();
    const previousEffect = renderHook(() => useSync(true, mockMasterKeys, previousLoadPages));
    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);
    });
    previousEffect.unmount();

    const nextLoadPages = vi.fn();
    const nextEffect = renderHook(() =>
      useSync(true, mockMasterKeys, nextLoadPages, 'next-workspace'),
    );
    expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePreviousPull();
    });
    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(2);
      expect(nextLoadPages).toHaveBeenCalled();
    });
    expect(previousLoadPages).not.toHaveBeenCalled();
    nextEffect.unmount();
  });

  it('does not start a queued sync after its wait timeout expires', async () => {
    let resolvePreviousPull: () => void = () => {};
    const previousPull = new Promise<void>((resolve) => {
      resolvePreviousPull = resolve;
    });
    vi.mocked(syncService.pullAllFromCloud).mockImplementationOnce(() => previousPull);

    const previousLoadPages = vi.fn();
    const previousEffect = renderHook(() => useSync(true, mockMasterKeys, previousLoadPages));
    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);
    });
    previousEffect.unmount();

    vi.useFakeTimers();
    const nextLoadPages = vi.fn();
    const nextEffect = renderHook(() =>
      useSync(true, mockMasterKeys, nextLoadPages, 'next-workspace'),
    );
    try {
      act(() => {
        vi.advanceTimersByTime(120_000);
      });
      await act(async () => {
        for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
      });

      await act(async () => {
        resolvePreviousPull();
        for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
      });
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);
    } finally {
      nextEffect.unmount();
      resolvePreviousPull();
      vi.useRealTimers();
    }
  });
});
