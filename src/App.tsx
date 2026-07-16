import { useEffect, useCallback, useState, useRef } from 'react';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { StoreProvider, useStore } from './store/useStore';
import { FocusProvider, useFocusContext } from './store/FocusContext';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import ContextMenu from './components/ContextMenu';
import ConfirmModal from './components/ConfirmModal';
import GlobalFocusOverlays from './components/focus/GlobalFocusOverlays';
import AuthScreen from './components/AuthScreen';
import { useActivityTracker } from './hooks/useActivityTracker';
import { getSettings, syncSettingsFromDb } from './utils/settings';
import type { AppSettings } from './utils/settings';
import AiSidebar from './components/AiSidebar';
import { useSync } from './hooks/useSync';
import { CheckCircle2, XCircle, Cloud } from 'lucide-react';
import { ViewFactory } from './components/ViewFactory';
import { usePageActions } from './hooks/usePageActions';

function AppContent() {
  const { state, dispatch } = useStore();
  const [isAuth, setIsAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<'new' | 'unencrypted' | 'encrypted' | 'error' | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const { loadData: loadFocusData } = useFocusContext();
  
  const {
    handleCreatePage,
    handleCreateLinkedPage,
    handleDeletePage,
    handleUpdatePage,
    handleUpdateContent
  } = usePageActions();

  // Load focus data when authenticated
  useEffect(() => {
    if (isAuth) {
      loadFocusData();
    }
  }, [isAuth, loadFocusData]);

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

  // Run Garbage Collector if needed
  useEffect(() => {
    if (isAuth) {
      const lastRunStr = localStorage.getItem('last_gc_run');
      const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      
      if (Date.now() - lastRun > SEVEN_DAYS) {
        import('./services/image-gc').then(m => {
          m.runImageGarbageCollector().then(() => {
            localStorage.setItem('last_gc_run', Date.now().toString());
          });
        });
      }
    }
  }, [isAuth]);

  const loadPages = useCallback(async () => {
    if (window.api) {
      try {
        const pages = await window.api.getAllPages();
        const pagesWithCrdt = pages.filter((p: any) => !!p.crdt_state).length;
        console.log(`[Caderno:LoadPages] SET_PAGES with ${pages.length} pages (${pagesWithCrdt} have crdt_state)`);
        dispatch({ type: 'SET_PAGES', pages });
      } catch (err) {
        console.error('Failed to load pages', err);
      }
    }
  }, [dispatch]);

  const { syncStatus } = useSync(isAuth, state.moduleKeys, loadPages);

  // Sync appSettings from DB once sync is successful (e.g. for incognito logins)
  useEffect(() => {
    if (syncStatus === 'success') {
      syncSettingsFromDb();
      window.dispatchEvent(new CustomEvent('caderno-sync-success'));
    }
  }, [syncStatus]);

  // Expõe as moduleKeys no window para o handlePaste do TipTap acessar
  // (handlers do ProseMirror não têm acesso ao contexto React)
  useEffect(() => {
    (window as any).__cadernoModuleKeys = state.moduleKeys;
  }, [state.moduleKeys]);

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
      dispatch({ type: 'SET_ACTIVE_TAB', tabId: state.tabs[0].id });
    }
  }, [state.tabs, state.activeTabId, dispatch]);

  // Global Keyboard Shortcuts (Alt + 1..9 for tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code && e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9) {
          const index = num - 1;
          if (index >= 0 && index < state.tabs.length) {
            e.preventDefault();
            dispatch({ type: 'SET_ACTIVE_TAB', tabId: state.tabs[index].id });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.tabs, dispatch]);

  // Update document title based on active module and platform
  useEffect(() => {
    const isDesktopApp = navigator.userAgent.toLowerCase().includes('Desktop');
    if (isDesktopApp) {
      document.title = 'Caderno Desktop';
    } else {
      if (activeModule === 'notes') {
        document.title = 'Caderno Web';
      } else if (activeModule === 'library') {
        document.title = activeTab?.bookTitle || 'Biblioteca';
      } else if (activeModule === 'culture') {
        document.title = 'Cultura';
      } else if (activeModule === 'finance') {
        document.title = 'Finanças';
      } else if (activeModule === 'anki') {
        document.title = 'Flashcards';
      } else {
        document.title = 'Caderno Web';
      }
    }
  }, [activeModule, activeTab?.bookTitle]);

  if (authStatus === null) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-dark-bg text-dark-subtext" style={{ height: '100dvh' }}>
        <span className="animate-pulse">Iniciando ambiente seguro...</span>
      </div>
    );
  }

  if (!isAuth) {
    return <AuthScreen status={authStatus} onSuccess={() => setIsAuth(true)} />;
  }

  return (
    <div className="w-screen h-screen flex bg-dark-bg text-dark-text overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      {!state.isReadingModeFullScreen && (
        <Sidebar
          onCreatePage={handleCreatePage}
          onUpdatePage={handleUpdatePage}
        />
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Bar - Only show in Desktop */}
        {!state.isReadingModeFullScreen && (window as any).__TAURI__ && <TabBar />}

        {/* Main Area */}
        <div className="flex-1 overflow-hidden relative">
          {state.tabs.map((tab) => {
            const isActive = tab.id === state.activeTabId;
            const page = tab.pageId ? state.pages.find((p) => p.id === tab.pageId) || null : null;
            
            return (
              <div 
                key={tab.id} 
                className={`absolute inset-0 flex flex-col ${isActive ? 'z-10 opacity-100 pointer-events-auto visible' : 'z-0 opacity-0 pointer-events-none invisible'}`}
              >
                <ViewFactory 
                  tab={tab}
                  page={page}
                  onUpdateContent={handleUpdateContent}
                  onCreatePage={handleCreatePage}
                  onCreateLinkedPage={handleCreateLinkedPage}
                  onUpdatePage={handleUpdatePage}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Sidebar */}
      {!state.isReadingModeFullScreen && <AiSidebar />}

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
      <GlobalFocusOverlays />
    </div>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <StoreProvider>
        <FocusProvider>
          <AppContent />
        </FocusProvider>
      </StoreProvider>
    </GlobalErrorBoundary>
  );
}
