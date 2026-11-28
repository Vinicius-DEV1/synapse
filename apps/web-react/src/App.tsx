import { useEffect, useCallback, useState, useRef, memo, useMemo, lazy, Suspense } from 'react';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { ToastProvider } from './components/ui/ToastContext';
import {
  StoreProvider,
  useStoreDispatch,
  useStoreSelector,
  useTabs,
  getStoreState,
  syncLayoutFromDb,
} from './store/useStore';
import { FocusProvider, useFocusActions } from './store/FocusContext';
import Sidebar from './components/layout/sidebar/Sidebar';
import TabBar from './components/layout/TabBar';
import { AppContextMenu } from './components/layout/AppContextMenu';
import { useActivityTracker } from './hooks/useActivityTracker';
import { getSettings, syncSettingsFromDb } from './utils/settings';
import { ViewFactory } from './components/ViewFactory';
import { usePageActions } from './hooks/usePageActions';
import { useAppAuth } from './hooks/useAppAuth';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { useAppTitle } from './hooks/useAppTitle';
import { useGarbageCollection } from './hooks/useGarbageCollection';
import { usePlatform } from './hooks/usePlatform';
import { isMobileScreen } from './services/platform';
import { TaskProvider } from './store/TaskContext';
import { GlobalModals } from './components/layout/GlobalModals';
import { useAppEvents } from './hooks/useAppEvents';
import { useAppBackPress } from './hooks/useAppBackPress';
import WindowControls from './components/layout/WindowControls';
import { I18nProvider } from './i18n';
import type { AppState, Page } from './types';

// Lazy-load heavy boot-deferred chunks (AiSidebar, AuthScreen, Firebase SyncCoordinator) (P2 + P6)
const AiSidebar = lazy(() => import('./components/AiSidebar'));
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const SyncCoordinator = lazy(() =>
  import('./hooks/useSync').then((m) => ({ default: m.SyncCoordinator }))
);

interface TabContentItemProps {
  tab: import('./types').Tab;
  isActive: boolean;
  navDirection: 'forward' | 'backward' | null;
  onUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[], senderInstanceId?: string) => Promise<void>;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onCreateLinkedPage: (title: string, parentId: string | null) => Promise<string>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

const TabContentItem = memo(function TabContentItem({
  tab,
  isActive,
  navDirection,
  onUpdateContent,
  onCreatePage,
  onCreateLinkedPage,
  onUpdatePage,
}: TabContentItemProps) {
  // Select only this tab's page so unrelated page edits never re-render AppContent or sibling tabs
  const page = useStoreSelector(
    useCallback(
      (s: AppState) => (tab.pageId ? s.pages.find((p) => p.id === tab.pageId) ?? null : null),
      [tab.pageId]
    )
  );

  return (
    <div 
      className={`absolute inset-0 flex flex-col ${isActive ? 'z-10 opacity-100 pointer-events-auto visible' : 'z-0 opacity-0 pointer-events-none invisible'}`}
      style={isActive ? undefined : { contentVisibility: 'hidden' }}
    >
      <div 
        key={page?.id || 'empty'} 
        className={`w-full h-full flex flex-col ${
          isActive && navDirection === 'forward' ? 'animate-slide-in-right' : 
          isActive && navDirection === 'backward' ? 'animate-slide-in-left' : ''
        }`}
      >
        <ErrorBoundary moduleName={`Aba: ${tab.module}`} pageId={tab.pageId}>
          <ViewFactory 
            tab={tab}
            page={page}
            onUpdateContent={onUpdateContent}
            onCreatePage={onCreatePage}
            onCreateLinkedPage={onCreateLinkedPage}
            onUpdatePage={onUpdatePage}
            isActive={isActive}
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}, (prev, next) => {
  if (prev.isActive !== next.isActive) return false;
  if (next.isActive) {
    return (
      prev.tab === next.tab &&
      prev.navDirection === next.navDirection &&
      prev.onUpdateContent === next.onUpdateContent &&
      prev.onCreatePage === next.onCreatePage &&
      prev.onCreateLinkedPage === next.onCreateLinkedPage &&
      prev.onUpdatePage === next.onUpdatePage
    );
  }
  return true;
});

/** Isolated boundary so opening/closing the AI sidebar never re-renders the main App shell */
const AiSidebarHost = memo(function AiSidebarHost() {
  const showAiSidebar = useStoreSelector((s) => s.showAiSidebar);
  const isReadingModeFullScreen = useStoreSelector((s) => s.isReadingModeFullScreen);

  if (!showAiSidebar || isReadingModeFullScreen) return null;

  return (
    <Suspense fallback={null}>
      <AiSidebar />
    </Suspense>
  );
});

/** Isolated boundary so right-click context menus never re-render AppContent or open tabs */
const AppContextMenuHost = memo(function AppContextMenuHost({
  handleCreatePage,
  handleImportPage,
  handleExportPage,
  handleUpdatePage,
  setRenamePageId,
  setMovePageId,
}: {
  handleCreatePage: (parentId: string | null) => Promise<void>;
  handleImportPage: (parentId: string | null) => Promise<void>;
  handleExportPage: (pageId: string) => Promise<void>;
  handleUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  setRenamePageId: (id: string | null) => void;
  setMovePageId: (id: string | null) => void;
}) {
  const contextMenu = useStoreSelector((s) => s.contextMenu);
  const dispatch = useStoreDispatch();

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => dispatch({ type: 'HIDE_CONTEXT_MENU' });
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu, dispatch]);

  if (!contextMenu) return null;

  return (
    <AppContextMenu
      contextMenu={contextMenu}
      pages={getStoreState().pages}
      dispatch={dispatch}
      handleCreatePage={handleCreatePage}
      handleImportPage={handleImportPage}
      handleExportPage={handleExportPage}
      handleUpdatePage={handleUpdatePage}
      setRenamePageId={setRenamePageId}
      setMovePageId={setMovePageId}
    />
  );
});

function AppContent() {
  const dispatch = useStoreDispatch();
  const tabs = useTabs();
  const activeTabId = useStoreSelector((s) => s.activeTabId);
  const isReadingModeFullScreen = useStoreSelector((s) => s.isReadingModeFullScreen);
  const navDirection = useStoreSelector((s) => s.navDirection);
  const moduleKeys = useStoreSelector((s) => s.moduleKeys);
  const activeWorkspaceId = useStoreSelector((s) => s.activeWorkspaceId);

  const { isAuth, setIsAuth, authStatus, setAuthStatus } = useAppAuth(dispatch);
  const platform = usePlatform();
  const [settings, setSettings] = useState(getSettings);
  const [isMobile, setIsMobile] = useState(() => isMobileScreen() || platform.platform === 'mobile-webview');
  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId) || tabs[0], [tabs, activeTabId]);
  const activeModule = activeTab?.module;
  const isReadingBook = activeTab?.module === 'library' && Boolean(activeTab?.bookTitle);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileScreen() || platform.platform === 'mobile-webview');
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [platform.platform]);

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(getSettings());
    };
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  // Prevent default window-level file drop navigation (e.g. WebKitGTK navigating to file://)
  useEffect(() => {
    const preventDrag = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDrag);
    window.addEventListener('drop', preventDrag);
    return () => {
      window.removeEventListener('dragover', preventDrag);
      window.removeEventListener('drop', preventDrag);
    };
  }, []);
  
  useAppShortcuts(getStoreState, dispatch);
  useAppTitle(activeModule, activeTab?.bookTitle);
  useGarbageCollection(isAuth);
  const { handleCreatePage, handleUpdatePage, handleDeletePage, handleUpdateContent, handleCreateLinkedPage, handleExportPage, handleImportPage } = usePageActions();
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [movePageId, setMovePageId] = useState<string | null>(null);
  const [floatingPageId, setFloatingPageId] = useState<string | null>(null);
  const [isDriveAuthModalOpen, setIsDriveAuthModalOpen] = useState(false);
  
  const { loadData: loadFocusData } = useFocusActions();

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
              keys: moduleKeys,
              token: token
            });
          });
        });
      }
    }
  }, [isAuth, loadFocusData, moduleKeys]);

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
        const loadedPages = await window.api.getAllPages();
        dispatch({ type: 'SET_PAGES', pages: loadedPages });
      } catch (err) {
        console.error('Failed to load pages', err);
      }
    }
  }, [dispatch]);

  // Load local pages immediately upon authentication instead of waiting for cloud pull.
  useEffect(() => {
    if (isAuth) {
      void loadPages();
    }
  }, [isAuth, loadPages]);

  // Sync appSettings from DB once initial sync is successful (e.g. for incognito logins)
  const hasSyncedInitialLayoutRef = useRef(false);
  useEffect(() => {
    const handleSyncSuccess = () => {
      if (!hasSyncedInitialLayoutRef.current) {
        hasSyncedInitialLayoutRef.current = true;
        syncSettingsFromDb();
        syncLayoutFromDb(dispatch);
      }
    };
    window.addEventListener('caderno-sync-success', handleSyncSuccess);
    return () => window.removeEventListener('caderno-sync-success', handleSyncSuccess);
  }, [dispatch]);

  // Expose moduleKeys on window for TipTap handlePaste access
  // (ProseMirror handlers cannot access React context)
  useEffect(() => {
    window.__cadernoModuleKeys = moduleKeys;
  }, [moduleKeys]);

  // Failsafe: self-correct activeTabId if detached from available tabs
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.id === activeTabId)) {
      dispatch({ type: 'SET_ACTIVE_TAB', tabId: tabs[0].id });
    }
  }, [tabs, activeTabId, dispatch]);

  // Flush pending editor changes whenever the active tab changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
  }, [activeTabId]);

  // If user switches away from a book in the library, ensure reading mode fullscreen is exited
  useEffect(() => {
    if (!activeTab || activeTab.module !== 'library' || !activeTab.bookTitle) {
      if (isReadingModeFullScreen) {
        dispatch({ type: 'SET_READING_MODE_FULLSCREEN', isFullScreen: false });
      }
    }
  }, [activeTab, isReadingModeFullScreen, dispatch]);

  const pageHistoryRef = useRef<string[]>([]);
  const lastPageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPageId = activeTab?.pageId || null;
    if (currentPageId && lastPageIdRef.current && lastPageIdRef.current !== currentPageId) {
      pageHistoryRef.current.push(lastPageIdRef.current);
      if (pageHistoryRef.current.length > 30) {
        pageHistoryRef.current.shift();
      }
    }
    lastPageIdRef.current = currentPageId;
  }, [activeTab]);

  useAppBackPress(getStoreState, dispatch, floatingPageId, setFloatingPageId, pageHistoryRef);

  if (authStatus === null) {
    return (
      <div className="w-full max-w-full h-full flex flex-col items-center justify-center bg-dark-bg text-dark-subtext relative overflow-hidden select-none" style={{ height: '100dvh' }}>
        {platform.isDesktop && (
          <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-10 z-50 flex items-center justify-end select-none pointer-events-auto">
            <WindowControls />
          </div>
        )}
        <div className="relative flex items-center justify-center mb-6">
          <img
            src="/icon.png"
            alt="Caderno"
            className="w-20 h-20 rounded-2xl shadow-2xl animate-pulse"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-dark-subtext/80 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
          <span>Iniciando ambiente seguro...</span>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return (
      <Suspense fallback={<div className="w-full h-full bg-dark-bg" style={{ height: '100dvh' }} />}>
        <AuthScreen status={authStatus} onSuccess={() => setIsAuth(true)} />
      </Suspense>
    );
  }

  return (
    <div className="w-full max-w-full h-full flex bg-dark-bg text-dark-text overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar */}
      {!isReadingModeFullScreen && (
        <Sidebar
          onCreatePage={handleCreatePage}
          onUpdatePage={handleUpdatePage}
        />
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Tab Bar - Show always on mobile or if enabled in settings for current platform */}
        {(platform.platform === 'mobile-webview' || (platform.supportsNativeTabs ? settings.enableTabsDesktop : settings.enableTabsWeb)) && (
          <div
            className={
              isReadingBook && isMobile
                ? `absolute top-0 left-0 right-0 z-40 transition-transform duration-300 ${isReadingModeFullScreen ? '-translate-y-full pointer-events-none' : 'translate-y-0'}`
                : isReadingModeFullScreen ? 'hidden' : ''
            }
          >
            <TabBar />
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 overflow-hidden relative">
          {tabs.map((tab) => (
            <TabContentItem
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              navDirection={navDirection}
              onUpdateContent={handleUpdateContent}
              onCreatePage={handleCreatePage}
              onCreateLinkedPage={handleCreateLinkedPage}
              onUpdatePage={handleUpdatePage}
            />
          ))}
        </div>
      </div>

      {/* Lazy-mounted AI Sidebar */}
      <AiSidebarHost />

      {/* Context Menu */}
      <AppContextMenuHost
        handleCreatePage={handleCreatePage}
        handleImportPage={handleImportPage}
        handleExportPage={handleExportPage}
        handleUpdatePage={handleUpdatePage}
        setRenamePageId={setRenamePageId}
        setMovePageId={setMovePageId}
      />

      {/* Background Sync Coordinator (lazy-loaded post-auth so Firebase SDK stays off initial boot chunk) */}
      <Suspense fallback={null}>
        <SyncCoordinator
          isAuth={isAuth}
          masterKey={moduleKeys}
          loadPages={loadPages}
          workspaceId={activeWorkspaceId || undefined}
        />
      </Suspense>

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
        <I18nProvider>
          <StoreProvider>
            <FocusProvider>
              <TaskProvider>
                <AppContent />
              </TaskProvider>
            </FocusProvider>
          </StoreProvider>
        </I18nProvider>
      </ToastProvider>
    </GlobalErrorBoundary>
  );
}
