import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppShortcuts } from './useAppShortcuts';
import type { AppState } from '../types';

describe('useAppShortcuts hook', () => {
  it('switches tabs on Alt+Digit shortcut', () => {
    const mockDispatch = vi.fn();
    const state: AppState = {
      pages: [],
      tabs: [
        { id: 'tab-1', module: 'notes', pageId: null, bookId: null, unsavedContent: null, scrollY: 0 },
        { id: 'tab-2', module: 'library', pageId: null, bookId: null, unsavedContent: null, scrollY: 0 },
      ],
      activeTabId: 'tab-1',
      sidebarCollapsed: false,
      expandedNodes: [],
      contextMenu: null,
      confirmDelete: null,
      aiChatSessions: {},
      showAiSidebar: false,
      aiSidebarWidth: 340,
      activeAiChatId: null,
      moduleKeys: {},
      isReadingModeFullScreen: false,
      navDirection: null,
    };

    renderHook(() => useAppShortcuts(state, mockDispatch));

    const event = new KeyboardEvent('keydown', {
      altKey: true,
      code: 'Digit2',
    });
    window.dispatchEvent(event);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ACTIVE_TAB',
      tabId: 'tab-2',
    });
  });

  it('toggles AI sidebar on Ctrl+J shortcut', () => {
    const mockDispatch = vi.fn();
    const state: AppState = {
      pages: [],
      tabs: [],
      activeTabId: '',
      sidebarCollapsed: false,
      expandedNodes: [],
      contextMenu: null,
      confirmDelete: null,
      aiChatSessions: {},
      showAiSidebar: false,
      aiSidebarWidth: 340,
      activeAiChatId: null,
      moduleKeys: {},
      isReadingModeFullScreen: false,
      navDirection: null,
    };

    renderHook(() => useAppShortcuts(state, mockDispatch));

    const event = new KeyboardEvent('keydown', {
      ctrlKey: true,
      key: 'j',
    });
    window.dispatchEvent(event);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_AI_SIDEBAR',
    });
  });
});
