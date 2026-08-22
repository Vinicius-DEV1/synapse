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
  onmessage: any = null;
  constructor(name: string) {
    this.name = name;
  }
  postMessage = vi.fn();
  close = vi.fn();
}

(global as any).BroadcastChannel = MockBroadcastChannel;

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
    let signalCallback: any = null;
    (syncService.listenForCloudSyncSignal as any).mockImplementation((cb: any) => {
      signalCallback = cb;
      return () => {};
    });

    const loadPages = vi.fn();
    renderHook(() => useSync(true, mockMasterKeys, loadPages));

    // Simulate signal from remote device
    await act(async () => {
      signalCallback?.('other-device-xyz');
    });

    expect(syncService.pullAllFromCloud).toHaveBeenCalled();
  });
});
