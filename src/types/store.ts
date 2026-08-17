import type { Page } from './notes';

export interface Tab {
  id: string;
  module: 'home' | 'notes' | 'library' | 'finance' | 'culture' | 'video' | 'anki' | 'focus' | 'calendar' | 'files' | 'vault' | 'practice' | 'trash' | 'diagrams' | 'settings';
  pageId: string | null;
  bookId?: string | null;
  bookTitle?: string;
  unsavedContent: string | null;
  scrollY: number;
  moduleState?: Record<string, any>;
}

export interface AiChatSession {
  id: string;
  pageId: string;
  pageTitle: string;
  contextText?: string;
  contextImage?: string;
  messages: any[];
  updatedAt: number;
}

export interface AppState {
  pages: Page[];
  tabs: Tab[];
  activeTabId: string;
  sidebarCollapsed: boolean;
  expandedNodes: string[];
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    pageId: string;
  } | null;
  confirmDelete: string | null;
  aiChatSessions: Record<string, AiChatSession>;
  showAiSidebar: boolean;
  aiSidebarWidth: number;
  activeAiChatId: string | null;
  moduleKeys: Record<string, CryptoKey>;
  isReadingModeFullScreen: boolean;
  navDirection: 'forward' | 'backward' | null;
}

export type Action =
  | { type: 'UPDATE_TAB_MODULE'; tabId: string; module: 'notes' | 'finance' | 'library' | 'culture' | 'video' | 'anki' | 'focus' | 'calendar' | 'files' | 'vault' | 'practice' | 'diagrams'; bookId?: string | null; moduleState?: Record<string, any> }
  | { type: 'OPEN_LIBRARY_BOOK'; bookId: string; title: string }
  | { type: 'CLOSE_LIBRARY_BOOK'; tabId: string }
  | { type: 'SET_PAGES'; pages: Page[] }
  | { type: 'ADD_PAGE'; page: Page }
  | { type: 'UPDATE_PAGE'; page: Partial<Page> & { id: string } }
  | { type: 'DELETE_PAGE'; id: string }
  | { type: 'ADD_TAB'; tab: Tab }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SET_ACTIVE_TAB'; tabId: string }
  | { type: 'REORDER_TABS'; sourceIndex: number; targetIndex: number }
  | { type: 'UPDATE_TAB_STATE'; tabId: string; stateUpdates: Record<string, any> }
  | { type: 'NAVIGATE_IN_TAB'; pageId: string }
  | { type: 'SET_UNSAVED_CONTENT'; tabId: string; content: string }
  | { type: 'SET_SCROLL_Y'; tabId: string; scrollY: number }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_NODE'; nodeId: string }
  | { type: 'SHOW_CONTEXT_MENU'; x: number; y: number; pageId: string }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'SET_CONFIRM_DELETE'; pageId: string | null }
  | { type: 'UPDATE_AI_CHAT'; session: AiChatSession }
  | { type: 'DELETE_AI_CHAT'; id: string }
  | { type: 'CLEAR_AI_CHATS' }
  | { type: 'TOGGLE_AI_SIDEBAR' }
  | { type: 'SET_AI_SIDEBAR_WIDTH'; width: number }
  | { type: 'OPEN_AI_CHAT'; chatId: string | null }
  | { type: 'SET_MODULE_KEYS'; keys: Record<string, CryptoKey> }
  | { type: 'SET_NAV_DIRECTION'; direction: 'forward' | 'backward' | null }
  | { type: 'SET_READING_MODE_FULLSCREEN'; isFullScreen: boolean }
  | { type: 'MERGE_DB_STATE'; payload: Partial<AppState> };
