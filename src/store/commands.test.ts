import { describe, it, expect } from 'vitest';
import { appReducer } from './commands';
import type { AppState, Page, Tab } from '../types';

describe('appReducer (store/commands)', () => {
  const createBaseState = (): AppState => ({
    pages: [],
    tabs: [
      {
        id: 'tab-1',
        module: 'notes',
        pageId: null,
        bookId: null,
        unsavedContent: null,
        scrollY: 0,
      },
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
  });

  describe('Pages management', () => {
    it('handles SET_PAGES, ADD_PAGE, UPDATE_PAGE', () => {
      let state = createBaseState();
      const page1: Page = { id: 'p1', title: 'Page 1', parent_id: null, content: 'Text 1' } as Page;
      const page2: Page = { id: 'p2', title: 'Page 2', parent_id: null, content: 'Text 2' } as Page;

      state = appReducer(state, { type: 'SET_PAGES', pages: [page1] });
      expect(state.pages).toHaveLength(1);

      state = appReducer(state, { type: 'ADD_PAGE', page: page2 });
      expect(state.pages).toHaveLength(2);

      state = appReducer(state, { type: 'UPDATE_PAGE', page: { id: 'p1', title: 'Page 1 Updated' } as Page });
      expect(state.pages.find(p => p.id === 'p1')?.title).toBe('Page 1 Updated');
    });

    it('recursively deletes child pages on DELETE_PAGE and clears corresponding tabs', () => {
      let state = createBaseState();
      const p1: Page = { id: 'parent', title: 'Parent', parent_id: null } as Page;
      const p2: Page = { id: 'child', title: 'Child', parent_id: 'parent' } as Page;
      const p3: Page = { id: 'grandchild', title: 'Grandchild', parent_id: 'child' } as Page;
      const pOther: Page = { id: 'other', title: 'Other', parent_id: null } as Page;

      state = appReducer(state, { type: 'SET_PAGES', pages: [p1, p2, p3, pOther] });
      state = appReducer(state, {
        type: 'ADD_TAB',
        tab: { id: 'tab-child', module: 'notes', pageId: 'child', bookId: null, unsavedContent: null, scrollY: 0 },
      });

      state = appReducer(state, { type: 'DELETE_PAGE', id: 'parent' });

      // parent, child, and grandchild must all be deleted
      expect(state.pages.map(p => p.id)).toEqual(['other']);
      // tab with pageId 'child' must have pageId reset to null
      expect(state.tabs.find(t => t.id === 'tab-child')?.pageId).toBeNull();
    });
  });

  describe('Tabs management', () => {
    it('handles ADD_TAB and activates the newly added tab', () => {
      let state = createBaseState();
      const newTab: Tab = {
        id: 'tab-2',
        module: 'library',
        pageId: null,
        bookId: null,
        unsavedContent: null,
        scrollY: 0,
      };

      state = appReducer(state, { type: 'ADD_TAB', tab: newTab });
      expect(state.tabs).toHaveLength(2);
      expect(state.activeTabId).toBe('tab-2');
    });

    it('does not close tab if only one tab exists', () => {
      let state = createBaseState();
      state = appReducer(state, { type: 'CLOSE_TAB', tabId: 'tab-1' });
      expect(state.tabs).toHaveLength(1);
    });

    it('closes tab and selects adjacent tab when closing active tab', () => {
      let state = createBaseState();
      const tab2: Tab = { id: 'tab-2', module: 'anki', pageId: null, bookId: null, unsavedContent: null, scrollY: 0 };
      const tab3: Tab = { id: 'tab-3', module: 'video', pageId: null, bookId: null, unsavedContent: null, scrollY: 0 };

      state = appReducer(state, { type: 'ADD_TAB', tab: tab2 });
      state = appReducer(state, { type: 'ADD_TAB', tab: tab3 });
      expect(state.activeTabId).toBe('tab-3');

      state = appReducer(state, { type: 'CLOSE_TAB', tabId: 'tab-3' });
      expect(state.tabs.map(t => t.id)).toEqual(['tab-1', 'tab-2']);
      expect(state.activeTabId).toBe('tab-2');
    });

    it('reorders tabs correctly on REORDER_TABS', () => {
      let state = createBaseState();
      const tab2: Tab = { id: 'tab-2', module: 'anki', pageId: null, bookId: null, unsavedContent: null, scrollY: 0 };
      const tab3: Tab = { id: 'tab-3', module: 'vault', pageId: null, bookId: null, unsavedContent: null, scrollY: 0 };

      state = appReducer(state, { type: 'ADD_TAB', tab: tab2 });
      state = appReducer(state, { type: 'ADD_TAB', tab: tab3 });

      // Current order: [tab-1, tab-2, tab-3]
      state = appReducer(state, { type: 'REORDER_TABS', sourceIndex: 0, targetIndex: 2 });
      expect(state.tabs.map(t => t.id)).toEqual(['tab-2', 'tab-3', 'tab-1']);
    });

    it('navigates in active tab and resets scroll on NAVIGATE_IN_TAB', () => {
      let state = createBaseState();
      state = appReducer(state, { type: 'SET_SCROLL_Y', tabId: 'tab-1', scrollY: 400 });
      state = appReducer(state, { type: 'NAVIGATE_IN_TAB', pageId: 'target-page' });

      expect(state.tabs[0].pageId).toBe('target-page');
      expect(state.tabs[0].scrollY).toBe(0);
    });
  });

  describe('UI & Navigation Controls', () => {
    it('toggles sidebar and nodes expand state', () => {
      let state = createBaseState();
      state = appReducer(state, { type: 'TOGGLE_SIDEBAR' });
      expect(state.sidebarCollapsed).toBe(true);

      state = appReducer(state, { type: 'TOGGLE_NODE', nodeId: 'node-1' });
      expect(state.expandedNodes).toContain('node-1');

      state = appReducer(state, { type: 'EXPAND_NODE', nodeId: 'node-2' });
      expect(state.expandedNodes).toEqual(['node-1', 'node-2']);

      state = appReducer(state, { type: 'TOGGLE_NODE', nodeId: 'node-1' });
      expect(state.expandedNodes).toEqual(['node-2']);
    });

    it('handles AI sidebar and chat session updates', () => {
      let state = createBaseState();
      state = appReducer(state, { type: 'TOGGLE_AI_SIDEBAR' });
      expect(state.showAiSidebar).toBe(true);

      const session = { id: 'chat-1', title: 'Chat 1', messages: [] } as any;
      state = appReducer(state, { type: 'UPDATE_AI_CHAT', session });
      expect(state.aiChatSessions['chat-1']).toBeDefined();

      state = appReducer(state, { type: 'OPEN_AI_CHAT', chatId: 'chat-1' });
      expect(state.activeAiChatId).toBe('chat-1');

      state = appReducer(state, { type: 'DELETE_AI_CHAT', id: 'chat-1' });
      expect(state.aiChatSessions['chat-1']).toBeUndefined();
      expect(state.activeAiChatId).toBeNull();
    });
  });
});
