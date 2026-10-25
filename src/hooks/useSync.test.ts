import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSync } from './useSync';
import * as syncService from '../services/sync';

vi.mock('../services/sync', () => ({
  pullAllFromCloud: vi.fn().mockResolvedValue(undefined),
  pushAllToCloud: vi.fn().mockResolvedValue(undefined),
  syncPdfsToCloud: vi.fn().mockResolvedValue(undefined),
  listenForCloudSyncSignal: vi.fn(() => () => {}),
}));

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  constructor(name: string) {
    this.name = name;
  }
  postMessage = vi.fn();
  close = vi.fn();
}

(globalThis as unknown as { BroadcastChannel: typeof MockBroadcastChannel }).BroadcastChannel = MockBroadcastChannel;

describe('useSync Hook', () => {
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
  });

  it('triggers initial full sync on mount when isAuth is true', async () => {
    const loadPages = vi.fn();

    const { result } = renderHook(() => useSync(true, mockMasterKeys, loadPages));

    expect(result.current.syncStatus).toBe('syncing');

    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledWith(mockMasterKeys);
      expect(loadPages).toHaveBeenCalled();
      expect(syncService.pushAllToCloud).toHaveBeenCalledWith(mockMasterKeys);
      expect(syncService.syncPdfsToCloud).toHaveBeenCalledWith(mockMasterKeys);
      expect(result.current.syncStatus).toBe('success');
    });
  });

  it('handles offline state during initial sync gracefully', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const loadPages = vi.fn();

    const { result } = renderHook(() => useSync(true, mockMasterKeys, loadPages));

    await vi.waitFor(() => {
      expect(result.current.syncStatus).toBe('error');
    });

    expect(syncService.pullAllFromCloud).not.toHaveBeenCalled();
  });

  it('responds to cloud sync signal from remote device', async () => {
    let signalCallback: ((signalDeviceId?: string) => void) | null = null;
    vi.mocked(syncService.listenForCloudSyncSignal).mockImplementation((cb) => {
      signalCallback = cb;
      // Firestore onSnapshot fires immediately on registration
      cb('initial-doc');
      return () => {};
    });

    const loadPages = vi.fn();
    renderHook(() => useSync(true, mockMasterKeys, loadPages));

    // Wait for initial sync to finish
    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);
    });

    // Simulate signal from remote device
    await act(async () => {
      signalCallback?.('other-device-xyz');
    });

    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(2);
    });
  });

  it('triggers full sync automatically when network reconnects (online event)', async () => {
    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const loadPages = vi.fn();
    renderHook(() => useSync(true, mockMasterKeys, loadPages));

    // Clear initial calls
    vi.mocked(syncService.pullAllFromCloud).mockClear();

    // Reconnect network
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledWith(mockMasterKeys);
    });
  });

  it('flushes debounced push immediately on pagehide or hidden visibility', async () => {
    const loadPages = vi.fn();
    renderHook(() => useSync(true, mockMasterKeys, loadPages));

    await vi.waitFor(() => {
      expect(syncService.pushAllToCloud).toHaveBeenCalledTimes(1);
    });

    vi.mocked(syncService.pushAllToCloud).mockClear();

    // Trigger debounced sync
    act(() => {
      window.dispatchEvent(new Event('app-sync-trigger'));
    });

    // Should NOT have pushed yet (waiting for 3s debounce)
    expect(syncService.pushAllToCloud).not.toHaveBeenCalled();

    // Trigger pagehide (e.g. mobile tab switch/close)
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });

    // Debounced push must be flushed immediately
    await vi.waitFor(() => {
      expect(syncService.pushAllToCloud).toHaveBeenCalledTimes(1);
    });
  });

  it('queues remote signal if received while already syncing and executes it once released', async () => {
    let signalCallback: ((signalDeviceId?: string) => void) | null = null;
    vi.mocked(syncService.listenForCloudSyncSignal).mockImplementation((cb) => {
      signalCallback = cb;
      // Firestore onSnapshot fires immediately on registration
      cb('initial-doc');
      return () => {};
    });

    let resolveInitialPull: () => void = () => {};
    const initialPullPromise = new Promise<void>((resolve) => {
      resolveInitialPull = resolve;
    });

    // Initial pull hangs until resolveInitialPull is called
    vi.mocked(syncService.pullAllFromCloud).mockImplementationOnce(() => initialPullPromise);

    const loadPages = vi.fn();
    renderHook(() => useSync(true, mockMasterKeys, loadPages));

    // While initial pull is still in flight (isSyncing = true), remote signal arrives
    await act(async () => {
      signalCallback?.('other-device-abc');
    });

    // Remote pull should not have run a second time yet (still 1 in flight)
    expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(1);

    // Complete the initial pull and subsequent initial push
    await act(async () => {
      resolveInitialPull();
    });

    // The queued signal should now be dequeued and executed
    await vi.waitFor(() => {
      expect(syncService.pullAllFromCloud).toHaveBeenCalledTimes(2);
    });
  });
});

