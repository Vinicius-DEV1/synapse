import { Suspense, lazy, memo, type ComponentType } from 'react';
import type { Tab, Page } from '../types';
import { ErrorBoundary } from './ui/ErrorBoundary';

// Helper to auto-retry chunk download or reload if new version was deployed
function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      console.warn('[ViewFactory] Falha ao carregar chunk de módulo, tentando atualizar...', error);
      const isRefreshed = sessionStorage.getItem('chunk_retry_' + window.location.pathname);
      if (!isRefreshed) {
        sessionStorage.setItem('chunk_retry_' + window.location.pathname, 'true');
        window.location.reload();
        return new Promise(() => {}); // Never resolves as reload is triggered
      }
      throw error;
    }
  });
}

// UI navigates to 'settings' module as a tab, although type
// `Tab['module']` (defined in src/types/store.ts) does not include it yet
// value. We widen the type here to reflect the actual runtime value
// (same convention used in src/components/layout/sidebar/Sidebar.tsx).
type ModuleId = Tab['module'] | 'settings';

const HomeView = lazyWithRetry(() => import('./home/HomeView'));
const PageView = lazyWithRetry(() => import('./page-view/PageView'));
const FinanceView = lazyWithRetry(() => import('./finance/FinanceView'));
const LibraryView = lazyWithRetry(() => import('./library/LibraryView'));
const CultureView = lazyWithRetry(() => import('./culture/CultureView'));
const VideoView = lazyWithRetry(() => import('./video-player/VideoView'));
const AnkiView = lazyWithRetry(() => import('./anki/AnkiView'));
const FocusApp = lazyWithRetry(() => import('./focus/FocusApp'));
const CalendarView = lazyWithRetry(() => import('./calendar/CalendarView'));
const FilesView = lazyWithRetry(() => import('./files/FilesView'));
const VaultView = lazyWithRetry(() => import('./vault/VaultView'));
const PracticeView = lazyWithRetry(() => import('./practice/PracticeView'));
const TrashView = lazyWithRetry(() => import('./trash/TrashView'));
const SettingsModule = lazyWithRetry(() => import('./settings/SettingsModule'));
const DiagramsModule = lazyWithRetry(() => import('./diagrams/DiagramsModule'));

export interface ViewFactoryProps {
  tab: Tab;
  page: Page | null;
  onUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[], senderInstanceId?: string) => Promise<void>;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onCreateLinkedPage: (title: string, parentId: string | null) => Promise<string>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  isActive?: boolean;
}

export const ViewFactory = memo(function ViewFactory({
  tab,
  page,
  onUpdateContent,
  onCreatePage,
  onCreateLinkedPage,
  onUpdatePage,
  isActive = true,
}: ViewFactoryProps) {
  const { id } = tab;
  const module = tab.module as ModuleId;

  const renderModule = () => {
    switch (module) {
      case 'home':
        return <HomeView tabId={id} />;
      case 'notes':
        return (
          <PageView
            page={page}
            onUpdateContent={onUpdateContent}
            onCreatePage={onCreatePage}
            onCreateLinkedPage={onCreateLinkedPage}
            onUpdatePage={onUpdatePage}
            isActive={isActive}
          />
        );
      case 'library':
        return <LibraryView tabId={id} />;
      case 'culture':
        return <CultureView />;
      case 'video':
        return <VideoView tabId={id} />;
      case 'anki':
        return <AnkiView />;
      case 'focus':
        return <FocusApp />;
      case 'calendar':
        return <CalendarView />;
      case 'files':
        return <FilesView />;
      case 'vault':
        return <VaultView />;
      case 'practice':
        return <PracticeView />;
      case 'trash':
        return <TrashView />;
      case 'settings':
        return <SettingsModule tab={tab} />;
      case 'diagrams':
        return <DiagramsModule />;
      case 'finance':
      default:
        return <FinanceView />;
    }
  };

  return (
    <Suspense fallback={
      <div className="w-full h-full flex items-center justify-center bg-dark-bg text-dark-subtext">
        <span className="animate-pulse">Carregando módulo...</span>
      </div>
    }>
      <ErrorBoundary moduleName={module} pageId={page?.id}>
        {renderModule()}
      </ErrorBoundary>
    </Suspense>
  );
});
