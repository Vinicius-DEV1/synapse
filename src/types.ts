export interface Page {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PageHistoryEntry {
  id: string;
  page_id: string;
  content: string;
  created_at: string;
}

export interface Tab {
  id: string;
  pageId: string | null;
  unsavedContent: string | null;
  scrollY: number;
}

export type TransactionType = 'income' | 'expense' | 'loan_made' | 'loan_taken';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  status: string;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  estimated_cost: number;
  priority: 'low' | 'medium' | 'high';
  expected_date: string | null;
  created_at: string;
}


export interface AppState {
  activeModule: 'notes' | 'finance';
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
}

export type Action =
  | { type: 'SET_ACTIVE_MODULE'; module: 'notes' | 'finance' }
  | { type: 'SET_PAGES'; pages: Page[] }
  | { type: 'ADD_PAGE'; page: Page }
  | { type: 'UPDATE_PAGE'; page: Partial<Page> & { id: string } }
  | { type: 'DELETE_PAGE'; id: string }
  | { type: 'ADD_TAB'; tab: Tab }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SET_ACTIVE_TAB'; tabId: string }
  | { type: 'NAVIGATE_IN_TAB'; pageId: string }
  | { type: 'SET_UNSAVED_CONTENT'; tabId: string; content: string }
  | { type: 'SET_SCROLL_Y'; tabId: string; scrollY: number }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_NODE'; nodeId: string }
  | { type: 'SHOW_CONTEXT_MENU'; x: number; y: number; pageId: string }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'SET_CONFIRM_DELETE'; pageId: string | null };


declare global {
  interface Window {
    api: {
      getAllPages: () => Promise<Page[]>;
      createPage: (page: { parentId: string | null; title?: string; icon?: string }) => Promise<Page>;
      updatePage: (page: { id: string; title?: string; icon?: string; content?: string; parent_id?: string | null }) => Promise<number>;
      deletePage: (id: string) => Promise<boolean>;
      reorderPages: (updates: { id: string; sort_order: number }[]) => Promise<boolean>;
      getPageHistory: (pageId: string) => Promise<PageHistoryEntry[]>;
      auth: {
        status: () => Promise<{ status: 'new' | 'unencrypted' | 'encrypted' | 'error' }>;
        login: (password: string) => Promise<{ success: boolean; error?: string }>;
        setup: (password: string) => Promise<{ success: boolean; error?: string }>;
        changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
        onLock: (callback: () => void) => () => void;
        lock: () => Promise<void>;
        setPreferences: (prefs: { autoLockOnSuspend: boolean }) => Promise<void>;
      };
      finance: {
        getTransactions: () => Promise<Transaction[]>;
        createTransaction: (tx: Partial<Transaction>) => Promise<Transaction>;
        deleteTransaction: (id: string) => Promise<boolean>;
        getWishlist: () => Promise<WishlistItem[]>;
        createWishlist: (item: Partial<WishlistItem>) => Promise<WishlistItem>;
        deleteWishlist: (id: string) => Promise<boolean>;
      };
    };
  }
}
