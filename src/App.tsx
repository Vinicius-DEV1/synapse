import { useEffect, useCallback, useState, useRef } from 'react';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { ToastProvider } from './components/ui/ToastContext';
import { StoreProvider, useStore, syncLayoutFromDb } from './store/useStore';
import { FocusProvider, useFocusContext } from './store/FocusContext';
import Sidebar from './components/layout/sidebar/Sidebar';
import TabBar from './components/layout/TabBar';
import ContextMenu from './components/modals/ContextMenu';
import AuthScreen from './components/AuthScreen';
import { useActivityTracker } from './hooks/useActivityTracker';
import { getSettings, syncSettingsFromDb } from './utils/settings';
import AiSidebar from './components/AiSidebar';
import { useSync } from './hooks/useSync';
import { ViewFactory } from './components/ViewFactory';
import { usePageActions } from './hooks/usePageActions';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useAppTitle } from './hooks/useAppTitle';
import { useGarbageCollection } from './hooks/useGarbageCollection';
import { usePlatform } from './hooks/usePlatform';
import { TaskProvider } from './store/TaskContext';
import { GlobalModals } from './components/layout/GlobalModals';
import { useAppEvents } from './hooks/useAppEvents';
import { useAppBackPress } from './hooks/useAppBackPress';


function AppContent() {
  const { state, dispatch } = useStore();
  const { isAuth, setIsAuth, authStatus, setAuthStatus } = useAppAuth(dispatch);
  const platform = usePlatform();
  const [settings, setSettings] = useState(getSettings);
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
  const activeModule = activeTab?.module;

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(getSettings());
    };
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);
  
  useAppShortcuts(state, dispatch);
  useAppTitle(activeModule, activeTab?.bookTitle);
  useGarbageCollection(isAuth);
  const { handleCreatePage, handleUpdatePage, handleDeletePage, handleUpdateContent, handleCreateLinkedPage, handleExportPage, handleImportPage } = usePageActions();
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [movePageId, setMovePageId] = useState<string | null>(null);
  const [floatingPageId, setFloatingPageId] = useState<string | null>(null);
  const [isDriveAuthModalOpen, setIsDriveAuthModalOpen] = useState(false);
  
  const { loadData: loadFocusData } = useFocusContext();

  useAppEvents(setMovePageId, setIsDriveAuthModalOpen, setFloatingPageId);

  useEffect(() => {
    if (isAuth) {
      loadFocusData();
      
      // Update Service Worker with keys and token for video streaming
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        import('./services/drive').then(({ getValidAccessToken }) => {
          getValidAccessToken().then(token => {
            navigator.serviceWorker.controller?.postMessage({
              type: 'SET_KEYS',
              keys: state.moduleKeys,
              token: token
            });
          });
        });
      }
    }
  }, [isAuth, loadFocusData, state.moduleKeys]);

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
        }).catch(console.error);
      }
    }
  });



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
      syncLayoutFromDb(dispatch);
      window.dispatchEvent(new CustomEvent('caderno-sync-success'));
    }
  }, [syncStatus, dispatch]);

  // Expose moduleKeys on window for TipTap handlePaste access
  // (ProseMirror handlers cannot access React context)
  useEffect(() => {
    window.__cadernoModuleKeys = state.moduleKeys;
  }, [state.moduleKeys]);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => {
      if (state.contextMenu) dispatch({ type: 'HIDE_CONTEXT_MENU' });
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [state.contextMenu, dispatch]);

  // Open Floating Page handled by useAppEvents

  // Failsafe: If activeTabId is completely detached from the available tabs (e.g. from a broken localStorage state),
  // self-correct to the first available tab so actions like NAVIGATE_IN_TAB don't silently fail.
  useEffect(() => {
    if (state.tabs.length > 0 && !state.tabs.some(t => t.id === state.activeTabId)) {
      dispatch({ type: 'SET_ACTIVE_TAB', tabId: state.tabs[0].id });
    }
  }, [state.tabs, state.activeTabId, dispatch]);

  // Flush pending editor changes whenever the active tab changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
  }, [state.activeTabId]);

  const pageHistoryRef = useRef<string[]>([]);
  const lastPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentTab = state.tabs.find(t => t.id === state.activeTabId);
    const currentPageId = currentTab?.pageId || null;
    if (currentPageId && lastPageIdRef.current && lastPageIdRef.current !== currentPageId) {
      pageHistoryRef.current.push(lastPageIdRef.current);
      if (pageHistoryRef.current.length > 30) {
        pageHistoryRef.current.shift();
      }
    }
    lastPageIdRef.current = currentPageId;
  }, [state.activeTabId, state.tabs]);

  useAppBackPress(state, dispatch, floatingPageId, setFloatingPageId, pageHistoryRef);

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
        {/* Tab Bar - Show always on mobile or if enabled in settings for current platform */}
        {!state.isReadingModeFullScreen && 
         (platform.platform === 'mobile-webview' || (platform.supportsNativeTabs ? settings.enableTabsDesktop : settings.enableTabsWeb)) && <TabBar />}

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
                <div 
                  key={page?.id || 'empty'} 
                  className={`w-full h-full flex flex-col ${
                    isActive && state.navDirection === 'forward' ? 'animate-slide-in-right' : 
                    isActive && state.navDirection === 'backward' ? 'animate-slide-in-left' : ''
                  }`}
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
              onOpenInNewTab={(id) => {
                const tabId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
                dispatch({
                  type: 'ADD_TAB',
                  tab: {
                    id: tabId,
                    module: 'notes',
                    pageId: id,
                    unsavedContent: null,
                    scrollY: 0,
                  },
                });
              }}
              onCreateSubPage={handleCreatePage}
              onImportSubPage={handleImportPage}
              onExportPage={handleExportPage}
              onDelete={(id) => dispatch({ type: 'SET_CONFIRM_DELETE', pageId: id })}
              onRename={(id) => setRenamePageId(id)}
              onMovePage={(id) => setMovePageId(id)}
              onTogglePin={(id) => {
                const isPinning = !contextPage?.is_pinned;
                const maxOrder = state.pages
                  .filter(p => p.is_pinned)
                  .reduce((max, p) => Math.max(max, p.pinned_order || 0), -1);
                handleUpdatePage(id, {
                  is_pinned: isPinning ? 1 : 0,
                  pinned_order: isPinning ? maxOrder + 1 : 0,
                });
              }}
              onClose={() => dispatch({ type: 'HIDE_CONTEXT_MENU' })}
            />
          );
        })()
      )}


      {/* Global Modals & Overlays Host */}
      <GlobalModals
        renamePageId={renamePageId}
        setRenamePageId={setRenamePageId}
        movePageId={movePageId}
        setMovePageId={setMovePageId}
        floatingPageId={floatingPageId}
        setFloatingPageId={setFloatingPageId}
        isDriveAuthModalOpen={isDriveAuthModalOpen}
        setIsDriveAuthModalOpen={setIsDriveAuthModalOpen}
        syncStatus={syncStatus}
        handleDeletePage={handleDeletePage}
        handleUpdatePage={handleUpdatePage}
        handleUpdateContent={handleUpdateContent}
        handleCreatePage={handleCreatePage}
        handleCreateLinkedPage={handleCreateLinkedPage}
      />
    </div>
  );
}


export default function App() {
  return (
    <GlobalErrorBoundary>
      <ToastProvider>
        <StoreProvider>
          <FocusProvider>
            <TaskProvider>
              <AppContent />
            </TaskProvider>
          </FocusProvider>
        </StoreProvider>
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}
