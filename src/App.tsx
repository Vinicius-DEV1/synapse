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
import { pushAllToCloud, pullAllFromCloud, syncPdfsToCloud } from './services/sync';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { state, dispatch } = useStore();
  const [isAuth, setIsAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<'new' | 'unencrypted' | 'encrypted' | 'error' | null>(null);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [isSyncing, setIsSyncing] = useState(false);

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
          dispatch({ type: 'SET_MASTER_KEY', key: null });
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
        dispatch({ type: 'SET_MASTER_KEY', key: null });
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

  useEffect(() => {
    if (isAuth && state.masterKey) {
      setIsSyncing(true);
      // 1. Ao logar, puxa todas as atualizações da nuvem
      pullAllFromCloud(state.masterKey)
        .then(() => {
          // Após puxar, recarrega a UI
          loadPages();
          // E empurra possíveis alterações locais antigas
          pushAllToCloud(state.masterKey!);
          // E sobe os PDFs legados do Desktop, se existirem
          syncPdfsToCloud(state.masterKey!);
        })
        .catch(err => console.error('Erro no sync inicial:', err))
        .finally(() => setIsSyncing(false));

      // 2. Cria um gatilho de sincronização a cada 3 minutos
      const syncInterval = setInterval(() => {
        if (state.masterKey) {
          setIsSyncing(true);
          Promise.all([
            pushAllToCloud(state.masterKey),
            syncPdfsToCloud(state.masterKey)
          ])
            .catch(console.error)
            .finally(() => setIsSyncing(false));
        }
      }, 3 * 60 * 1000);

      return () => clearInterval(syncInterval);
    }
  }, [isAuth, state.masterKey, loadPages]);

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

  const handleUpdateContent = useCallback(async (id: string, content: string, embeddedSaves?: {id: string, content: string}[]) => {
    if (window.api) {
      await window.api.updatePage({ id, content });
      dispatch({ type: 'UPDATE_PAGE', page: { id, content } });
      
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

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
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
        {/* Tab Bar */}
        <TabBar />

        {/* Main Area */}
        <div className="flex-1 overflow-hidden">
          {state.activeModule === 'notes' ? (
            <PageView
              page={activePage}
              onUpdateContent={handleUpdateContent}
              onCreatePage={handleCreatePage}
              onCreateLinkedPage={handleCreateLinkedPage}
              onUpdatePage={handleUpdatePage}
            />
          ) : state.activeModule === 'library' ? (
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
        <ContextMenu
          x={state.contextMenu.x}
          y={state.contextMenu.y}
          pageId={state.contextMenu.pageId}
          onCreateSubPage={handleCreatePage}
          onDelete={(id) => dispatch({ type: 'SET_CONFIRM_DELETE', pageId: id })}
          onRename={(id, title) => handleUpdatePage(id, { title })}
        />
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

      {/* Syncing Indicator */}
      <div 
        className={`fixed bottom-6 right-6 flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-full shadow-lg shadow-brand-500/20 pointer-events-none transition-all duration-500 ease-in-out z-[9999]
          ${isSyncing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        `}
      >
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm font-medium">Sincronizando...</span>
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
