import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  StoreProvider,
  useStore,
  useStoreDispatch,
  useStoreSelector,
  useActiveTab,
  usePages,
  useTabs,
  getCultureKey,
  syncLayoutFromDb,
} from './useStore';

describe('useStore & StoreProvider (store/useStore)', () => {
  beforeEach(() => {
    localStorage.clear();
    (window as any).api = {
      config: {
        get: vi.fn().mockResolvedValue({ sidebarCollapsed: true }),
        set: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <StoreProvider>{children}</StoreProvider>
  );

  it('provides initial state and dispatches actions', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.state.tabs.length).toBeGreaterThanOrEqual(1);
    expect(result.current.state.sidebarCollapsed).toBe(false);

    act(() => {
      result.current.dispatch({ type: 'TOGGLE_SIDEBAR' });
    });

    expect(result.current.state.sidebarCollapsed).toBe(true);
  });

  it('persists layout state to localStorage when state changes', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'TOGGLE_SIDEBAR' });
    });

    const saved = localStorage.getItem('appLayoutState');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.sidebarCollapsed).toBe(true);
  });

  it('syncLayoutFromDb merges database layout into state', async () => {
    const mockDispatch = vi.fn();
    await syncLayoutFromDb(mockDispatch);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'MERGE_DB_STATE',
      payload: { sidebarCollapsed: true },
    });
  });

  it('getCultureKey returns key from global state reference', () => {
    const { result } = renderHook(() => useStore(), { wrapper });
    const mockKey = {} as CryptoKey;

    act(() => {
      result.current.dispatch({
        type: 'SET_MODULE_KEYS',
        keys: { culture: mockKey },
      });
    });

    expect(getCultureKey()).toBe(mockKey);
  });

  it('provides identity-stable useStoreDispatch and updates state', () => {
    const { result } = renderHook(
      () => ({
        dispatch: useStoreDispatch(),
        store: useStore(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.dispatch({ type: 'TOGGLE_SIDEBAR' });
    });

    expect(result.current.store.state.sidebarCollapsed).toBe(true);
  });

  it('isolates state changes via useStoreSelector', () => {
    const { result: selectorResult } = renderHook(
      () => useStoreSelector((s) => s.sidebarCollapsed),
      { wrapper }
    );
    const { result: dispatchResult } = renderHook(() => useStoreDispatch(), { wrapper });

    expect(selectorResult.current).toBe(false);

    act(() => {
      dispatchResult.current({ type: 'TOGGLE_SIDEBAR' });
    });

    expect(selectorResult.current).toBe(true);
  });

  it('returns sliced collections via useActiveTab, usePages, and useTabs', () => {
    const { result: tabResult } = renderHook(() => useActiveTab(), { wrapper });
    const { result: pagesResult } = renderHook(() => usePages(), { wrapper });
    const { result: tabsResult } = renderHook(() => useTabs(), { wrapper });

    expect(tabResult.current?.module).toBe('home');
    expect(pagesResult.current).toEqual([]);
    expect(tabsResult.current.length).toBeGreaterThanOrEqual(1);
  });
});
