import { useEffect, useCallback, useState } from 'react';
import { StoreProvider, useStore } from './store/useStore';
import type { Page } from './types';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import PageView from './components/PageView';
import ContextMenu from './components/ContextMenu';
import ConfirmModal from './components/ConfirmModal';
import FinanceView from './components/finance/FinanceView';
import LibraryView from './components/library/LibraryView';
import AuthScreen from './components/AuthScreen';
import { useActivityTracker } from './hooks/useActivityTracker';
import { getSettings } from './utils/settings';
import type { AppSettings } from './utils/settings';
import AiSidebar from './components/AiSidebar';
import { useSync } from './hooks/useSync';
import { CheckCircle2, XCircle, Cloud } from 'lucide-react';

function AppContent() {
  const { state, dispatch } = useStore();
  const [isAuth, setIsAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<'new' | 'unencrypted' | 'encrypted' | 'error' | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  // Listen to settings changes
  useEffect(() => {
    const handleSettingsChange = () => setSettings(getSettings());
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  // Lock on inactivity
  useActivityTracker({
    timeoutMinutes: settings.inactivityTimeoutMinutes,
    isActive: isAuth,
    onTimeout: () => {
      if (window.api?.auth) {
        window.api.auth.lock().then(() => {
          setIsAuth(false);
          setAuthStatus('encrypted');
          dispatch({ type: 'SET_MODULE_KEYS', keys: {} });
        });
      }
    }
  });

  useEffect(() => {
    if (window.api?.auth) {
      window.api.auth.status().then((res) => {
        setAuthStatus(res.status);
      }).catch((err) => {
        console.error('Failed to get auth status:', err);
      });

      const cleanup = window.api.auth.onLock(() => {
        setIsAuth(false);
        setAuthStatus('encrypted');
        dispatch({ type: 'SET_MODULE_KEYS', keys: {} });
      });
      
      // Initialize backend preferences
      window.api.auth.setPreferences({ autoLockOnSuspend: getSettings().autoLockOnSuspend });

      return cleanup;
    }
  }, []);

  const loadPages = useCallback(async () => {
    if (window.api) {
      try {
        const pages = await window.api.getAllPages();
        dispatch({ type: 'SET_PAGES', pages });
      } catch (err) {
        console.error('Failed to load pages', err);
      }
    }
  }, [dispatch]);

  const { syncStatus } = useSync(isAuth, state.moduleKeys, loadPages);

  const handleCreatePage = useCallback(async (parentId: string | null) => {
    if (window.api) {
      const page = await window.api.createPage({ parentId });
      dispatch({ type: 'ADD_PAGE', page });
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: page.id });
      if (parentId && !state.expandedNodes.includes(parentId)) {
        dispatch({ type: 'TOGGLE_NODE', nodeId: parentId });
      }
    }
  }, [dispatch, state.expandedNodes]);

  const handleCreateLinkedPage = useCallback(async (title: string, parentId: string | null = null) => {
    if (window.api) {
      const page = await window.api.createPage({ parentId });
      await window.api.updatePage({ id: page.id, title });
      page.title = title;
      dispatch({ type: 'ADD_PAGE', page });
      return page.id;
    }
    return '';
  }, [dispatch]);

  const handleDeletePage = useCallback(async (id: string) => {
    if (window.api) {
      await window.api.deletePage(id);
      dispatch({ type: 'DELETE_PAGE', id });
      dispatch({ type: 'SET_CONFIRM_DELETE', pageId: null });
    }
  }, [dispatch]);

  const handleUpdatePage = useCallback(async (id: string, updates: Partial<Page>) => {
    if (window.api) {
      await window.api.updatePage({ id, ...updates });
      dispatch({ type: 'UPDATE_PAGE', page: { id, ...updates } });
    }
  }, [dispatch]);

  const handleUpdateContent = useCallback(async (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => {
    if (window.api) {
      await window.api.updatePage({ id, content, crdt_state: crdtState });
      dispatch({ type: 'UPDATE_PAGE', page: { id, content, crdt_state: crdtState } });
      
      if (embeddedSaves && embeddedSaves.length > 0) {
        for (const embed of embeddedSaves) {
          await window.api.updatePage({ id: embed.id, content: embed.content });
          dispatch({ type: 'UPDATE_PAGE', page: { id: embed.id, content: embed.content } });
        }
      }
    }
  }, [dispatch]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => {
      if (state.contextMenu) dispatch({ type: 'HIDE_CONTEXT_MENU' });
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [state.contextMenu, dispatch]);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
  const activeModule = activeTab.module;

  // Failsafe: If activeTabId is completely detached from the available tabs (e.g. from a broken localStorage state),
  // self-correct to the first available tab so actions like NAVIGATE_IN_TAB don't silently fail.
  useEffect(() => {
    if (state.tabs.length > 0 && !state.tabs.some(t => t.id === state.activeTabId)) {
      dispatch({ type: 'SWITCH_TAB', tabId: state.tabs[0].id });
    }
  }, [state.tabs, state.activeTabId, dispatch]);

  // Update document title based on active module and platform
  useEffect(() => {
    const isElectron = navigator.userAgent.toLowerCase().includes('electron');
    if (isElectron) {
      document.title = 'Caderno Desktop';
    } else {
      if (activeModule === 'notes') {
        document.title = 'Caderno Web';
      } else if (activeModule === 'library') {
        document.title = 'Biblioteca';
      } else if (activeModule === 'finance') {
        document.title = 'Finanças';
      } else {
        document.title = 'Caderno Web';
      }
    }
  }, [activeModule]);

  const activePage = activeTab?.pageId
    ? state.pages.find((p) => p.id === activeTab.pageId) || null
    : null;

  if (authStatus === null) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-dark-bg text-dark-subtext">
        <span className="animate-pulse">Iniciando ambiente seguro...</span>
      </div>
    );
  }

  if (!isAuth) {
    return <AuthScreen status={authStatus} onSuccess={() => setIsAuth(true)} />;
  }

  return (
    <div className="w-screen h-screen flex bg-dark-bg text-dark-text overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        onCreatePage={handleCreatePage}
        onUpdatePage={handleUpdatePage}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Bar - Only show in Electron */}
        {navigator.userAgent.toLowerCase().includes('electron') && <TabBar />}

        {/* Main Area */}
        <div className="flex-1 overflow-hidden">
          {activeModule === 'notes' ? (
            <PageView
              page={activePage}
              onUpdateContent={handleUpdateContent}
              onCreatePage={handleCreatePage}
              onCreateLinkedPage={handleCreateLinkedPage}
              onUpdatePage={handleUpdatePage}
            />
          ) : activeModule === 'library' ? (
            <LibraryView />
          ) : (
            <FinanceView />
          )}
        </div>
      </div>

      {/* AI Sidebar */}
      <AiSidebar />

      {/* Context Menu */}
      {state.contextMenu && (
        (() => {
          const contextPage = state.pages.find(p => p.id === state.contextMenu!.pageId);
          return (
            <ContextMenu
              x={state.contextMenu.x}
              y={state.contextMenu.y}
              pageId={state.contextMenu.pageId}
              isPinned={!!contextPage?.is_pinned}
              onCreateSubPage={handleCreatePage}
              onDelete={(id) => dispatch({ type: 'SET_CONFIRM_DELETE', pageId: id })}
              onRename={(id, title) => handleUpdatePage(id, { title })}
              onTogglePin={(id) => handleUpdatePage(id, { is_pinned: contextPage?.is_pinned ? 0 : 1 })}
              onClose={() => dispatch({ type: 'HIDE_CONTEXT_MENU' })}
            />
          );
        })()
      )}


      {/* Confirm Delete Modal */}
      {state.confirmDelete && (
        <ConfirmModal
          pageId={state.confirmDelete}
          pageName={state.pages.find((p) => p.id === state.confirmDelete)?.title || 'esta página'}
          onConfirm={() => handleDeletePage(state.confirmDelete!)}
          onCancel={() => dispatch({ type: 'SET_CONFIRM_DELETE', pageId: null })}
        />
      )}

      {/* Sync Status Toast (Ultra Discreet) */}
      <div
        className={`fixed bottom-4 right-6 flex items-center gap-1.5 pointer-events-none transition-opacity duration-1000 z-[9999]
          ${syncStatus === 'idle' ? 'opacity-0' : 'opacity-40'}
        `}
      >
        {syncStatus === 'syncing' && <Cloud size={12} className="text-dark-subtext animate-pulse" />}
        {syncStatus === 'success' && <CheckCircle2 size={12} className="text-emerald-400" />}
        {syncStatus === 'error'   && <XCircle size={12} className="text-red-400" />}
        <span className="text-[10px] font-medium text-dark-subtext uppercase tracking-widest">
          {syncStatus === 'syncing' ? 'Salvando' :
           syncStatus === 'success' ? 'Salvo' :
           syncStatus === 'error'   ? (!navigator.onLine ? 'Offline' : 'Erro') : ''}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
