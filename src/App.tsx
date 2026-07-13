import { useEffect, useCallback, useState, useRef } from 'react';
import { StoreProvider, useStore } from './store/useStore';
import { FocusProvider, useFocusContext } from './store/FocusContext';
import type { Page } from './types';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import PageView from './components/PageView';
import ContextMenu from './components/ContextMenu';
import ConfirmModal from './components/ConfirmModal';
import FinanceView from './components/finance/FinanceView';
import LibraryView from './components/library/LibraryView';
import CultureView from './components/culture/CultureView';
import VideoView from './components/video-player/VideoView';
import AnkiView from './components/anki/AnkiView';
import FocusApp from './components/focus/FocusApp';
import CalendarView from './components/calendar/CalendarView';
import GlobalFocusOverlays from './components/focus/GlobalFocusOverlays';
import AuthScreen from './components/AuthScreen';
import { useActivityTracker } from './hooks/useActivityTracker';
import { getSettings, syncSettingsFromDb } from './utils/settings';
import type { AppSettings } from './utils/settings';
import AiSidebar from './components/AiSidebar';
import { useSync } from './hooks/useSync';
import { CheckCircle2, XCircle, Cloud } from 'lucide-react';

function AppContent() {
  const { state, dispatch } = useStore();
  const [isAuth, setIsAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<'new' | 'unencrypted' | 'encrypted' | 'error' | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const { loadData: loadFocusData } = useFocusContext();

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

  const historyTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleUpdateContent = useCallback(async (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => {
    if (window.api) {
      await window.api.updatePage({ id, content, crdt_state: crdtState });
      
      // Auto-save to page history with 5s debounce
      if (historyTimerRef.current[id]) clearTimeout(historyTimerRef.current[id]);
      historyTimerRef.current[id] = setTimeout(() => {
        window.api?.savePageHistory?.(id, content).catch(console.error);
      }, 5000);
      
      if (embeddedSaves && embeddedSaves.length > 0) {
        for (const embed of embeddedSaves) {
          await window.api.updatePage({ id: embed.id, content: embed.content });
        }
      }
      
      // Dispara o evento de sincronização (debounce de 1.5s no useSync)
      if (window.api.onSyncTrigger) {
         // O preload cuida disso via ipcRenderer se necessário, ou usamos um evento
      } else {
         window.dispatchEvent(new CustomEvent('app-sync-trigger'));
      }
    }
  }, []);

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
    const isElectron = navigator.userAgent.toLowerCase().includes('electron');
    if (isElectron) {
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

  const activePage = activeTab?.pageId
    ? state.pages.find((p) => p.id === activeTab.pageId) || null
    : null;

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
        {/* Tab Bar - Only show in Electron */}
        {!state.isReadingModeFullScreen && navigator.userAgent.toLowerCase().includes('electron') && <TabBar />}

        {/* Main Area */}
        <div className="flex-1 overflow-hidden relative">
          {state.tabs.map((tab) => {
            const isActive = tab.id === state.activeTabId;
            const tabModule = tab.module;
            const page = tab.pageId ? state.pages.find((p) => p.id === tab.pageId) || null : null;
            
            return (
              <div 
                key={tab.id} 
                className={`absolute inset-0 flex flex-col ${isActive ? 'z-10 opacity-100 pointer-events-auto visible' : 'z-0 opacity-0 pointer-events-none invisible'}`}
              >
                {tabModule === 'notes' ? (
                  <PageView
                    page={page}
                    onUpdateContent={handleUpdateContent}
                    onCreatePage={handleCreatePage}
                    onCreateLinkedPage={handleCreateLinkedPage}
                    onUpdatePage={handleUpdatePage}
                  />
                ) : tabModule === 'library' ? (
                  <LibraryView tabId={tab.id} />
                ) : tabModule === 'culture' ? (
                  <CultureView />
                ) : tabModule === 'video' ? (
                  <VideoView />
                ) : tabModule === 'anki' ? (
                  <AnkiView />
                ) : tabModule === 'focus' ? (
                  <FocusApp />
                ) : tabModule === 'calendar' ? (
                  <CalendarView />
                ) : (
                  <FinanceView />
                )}
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
    <StoreProvider>
      <FocusProvider>
        <AppContent />
      </FocusProvider>
    </StoreProvider>
  );
}
