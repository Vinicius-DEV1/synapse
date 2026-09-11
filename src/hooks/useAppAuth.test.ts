import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAppAuth } from './useAppAuth';

describe('useAppAuth hook', () => {
  let mockDispatch: any;

  beforeEach(() => {
    mockDispatch = vi.fn();
    (window as any).api = {
      auth: {
        status: vi.fn().mockResolvedValue({ status: 'encrypted' }),
        onLock: vi.fn().mockImplementation((callback: () => void) => {
          return vi.fn(); // cleanup
        }),
        setPreferences: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('fetches and sets auth status on mount', async () => {
    const { result } = renderHook(() => useAppAuth(mockDispatch));

    await waitFor(() => {
      expect(result.current.authStatus).toBe('encrypted');
    });

    expect((window as any).api.auth.setPreferences).toHaveBeenCalledWith({
      autoLockOnSuspend: true,
    });
  });

  it('resets module keys when onLock triggers', async () => {
    let lockTrigger: () => void = () => {};
    (window as any).api.auth.onLock = vi.fn().mockImplementation((cb: () => void) => {
      lockTrigger = cb;
      return vi.fn();
    });

    const { result } = renderHook(() => useAppAuth(mockDispatch));

    await waitFor(() => {
      expect(result.current.authStatus).toBe('encrypted');
    });

    // Simulate lock event
    lockTrigger();

    expect(result.current.isAuth).toBe(false);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_MODULE_KEYS',
      keys: {},
    });
  });

  it('triggers lock and resets module keys when system suspend time drift occurs', async () => {
    vi.useFakeTimers();
    const lockMock = vi.fn().mockResolvedValue(undefined);
    (window as any).api.auth.lock = lockMock;

    const { result } = renderHook(() => useAppAuth(mockDispatch));

    // Simulate user being authenticated
    act(() => {
      result.current.setIsAuth(true);
    });

    // Simulate OS suspend: system clock jumps forward by 15s
    vi.setSystemTime(Date.now() + 15000);
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(lockMock).toHaveBeenCalled();
    expect(result.current.isAuth).toBe(false);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_MODULE_KEYS',
      keys: {},
    });

    vi.useRealTimers();
  });
});


