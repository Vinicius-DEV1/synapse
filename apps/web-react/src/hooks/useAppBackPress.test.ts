import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppBackPress } from './useAppBackPress';
import type { AppState, Action } from '../types/store';

describe('useAppBackPress hook (Android & Multiplatform Hardware Back Pipeline)', () => {
  let mockState: AppState;
  let mockDispatch: (action: Action) => void;
  let setFloatingPageId: (id: string | null) => void;
  let pageHistoryRef: { current: string[] };

  beforeEach(() => {
    mockDispatch = vi.fn();
    setFloatingPageId = vi.fn();
    pageHistoryRef = { current: [] };

    mockState = {
      pages: [],
      activePageId: null,
      activeTabId: 'tab-1',
      tabs: [
        { id: 'tab-1', title: 'Notes', module: 'notes', pageId: 'p1' },
      ],
      sidebarCollapsed: true,
      showAiSidebar: false,
      contextMenu: null,
      confirmDelete: null,
    } as unknown as AppState;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows subviews to intercept back navigation via caderno-back-press event', () => {
    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const backListener = vi.fn((e: Event) => {
      e.preventDefault(); // Intercept!
    });
    window.addEventListener('caderno-back-press', backListener);

    const handled = (window as any).__cadernoHandleBack?.();

    expect(backListener).toHaveBeenCalled();
    expect(handled).toBe(true);
    expect(setFloatingPageId).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();

    window.removeEventListener('caderno-back-press', backListener);
  });

  it('closes floating page modal when open (Level 1 priority)', () => {
    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, 'floating-p123', setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(setFloatingPageId).toHaveBeenCalledWith(null);
  });

  it('closes context menu when open (Level 2 priority)', () => {
    mockState.contextMenu = { x: 100, y: 150, pageId: 'p1' } as any;

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'HIDE_CONTEXT_MENU' });
  });

  it('closes confirm delete dialog when open (Level 3 priority)', () => {
    mockState.confirmDelete = 'page-to-delete-123' as any;

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_CONFIRM_DELETE', pageId: null });
  });

  it('closes AI sidebar when open (Level 4 priority)', () => {
    mockState.showAiSidebar = true;

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_AI_SIDEBAR' });
  });

  it('closes expanded sidebar on mobile viewport (< 768px) (Level 5 priority)', () => {
    mockState.sidebarCollapsed = false;
    // Set viewport width to mobile 375px
    vi.stubGlobal('innerWidth', 375);

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_SIDEBAR' });

    vi.unstubAllGlobals();
  });

  it('closes active library book when viewing EPUB/PDF (Level 7 priority)', () => {
    mockState.activeTabId = 'tab-lib';
    mockState.tabs = [
      { id: 'tab-lib', title: 'Reading Book', module: 'library', bookId: 'book-456' } as any,
    ];

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_LIBRARY_BOOK', tabId: 'tab-lib' });
  });

  it('navigates to parent page when viewing subpage (Level 9 priority)', () => {
    mockState.pages = [
      { id: 'child-page', title: 'Child Note', parent_id: 'root-parent-id' } as any,
      { id: 'root-parent-id', title: 'Root Note', parent_id: null } as any,
    ];
    mockState.activeTabId = 'tab-1';
    mockState.tabs = [
      { id: 'tab-1', title: 'Notes', module: 'notes', pageId: 'child-page' } as any,
    ];

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'NAVIGATE_IN_TAB', pageId: 'root-parent-id' });
  });

  it('navigates back in page history stack when history entries exist (Level 10 priority)', () => {
    pageHistoryRef.current = ['history-page-1', 'history-page-2'];
    mockState.pages = [
      { id: 'history-page-2', title: 'Target Previous Page', parent_id: null } as any,
    ];

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'NAVIGATE_IN_TAB', pageId: 'history-page-2' });
    expect(pageHistoryRef.current).toEqual(['history-page-1']);
  });

  it('closes active tab when multiple tabs exist (Level 11 priority)', () => {
    mockState.activeTabId = 'tab-2';
    mockState.tabs = [
      { id: 'tab-1', title: 'Tab 1', module: 'notes' } as any,
      { id: 'tab-2', title: 'Tab 2', module: 'notes' } as any,
    ];

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    const handled = (window as any).__cadernoHandleBack?.();

    expect(handled).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'CLOSE_TAB', tabId: 'tab-2' });
  });

  it('bridges native HARDWARE_BACK_PRESS message from mobile WebView shell', () => {
    const mockPostMessage = vi.fn();
    (window as any).ReactNativeWebView = { postMessage: mockPostMessage };

    mockState.showAiSidebar = true;

    renderHook(() =>
      useAppBackPress(mockState, mockDispatch, null, setFloatingPageId, pageHistoryRef)
    );

    // Simulate native message event from Android hardware back button
    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'HARDWARE_BACK_PRESS' }),
      })
    );

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE_AI_SIDEBAR' });
    expect(mockPostMessage).toHaveBeenCalledWith(
      JSON.stringify({ type: 'BACK_PRESS_HANDLED', handled: true })
    );

    delete (window as any).ReactNativeWebView;
  });
});
