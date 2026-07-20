import React, { Suspense, lazy } from 'react';
import type { Tab, Page } from '../types';

const PageView = lazy(() => import('./page-view/PageView'));
const FinanceView = lazy(() => import('./finance/FinanceView'));
const LibraryView = lazy(() => import('./library/LibraryView'));
const CultureView = lazy(() => import('./culture/CultureView'));
const VideoView = lazy(() => import('./video-player/VideoView'));
const AnkiView = lazy(() => import('./anki/AnkiView'));
const FocusApp = lazy(() => import('./focus/FocusApp'));
const CalendarView = lazy(() => import('./calendar/CalendarView'));
const FilesView = lazy(() => import('./files/FilesView'));
const VaultView = lazy(() => import('./vault/VaultView'));
const PracticeView = lazy(() => import('./practice/PracticeView'));
const TrashView = lazy(() => import('./trash/TrashView'));

export interface ViewFactoryProps {
  tab: Tab;
  page: Page | null;
  onUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => Promise<void>;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onCreateLinkedPage: (title: string, parentId: string | null) => Promise<string>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

export function ViewFactory({
  tab,
  page,
  onUpdateContent,
  onCreatePage,
  onCreateLinkedPage,
  onUpdatePage
}: ViewFactoryProps) {
  const { module, id } = tab;

  const renderModule = () => {
    switch (module) {
      case 'notes':
        return (
          <PageView
            page={page}
            onUpdateContent={onUpdateContent}
            onCreatePage={onCreatePage}
            onCreateLinkedPage={onCreateLinkedPage}
            onUpdatePage={onUpdatePage}
          />
        );
      case 'library':
        return <LibraryView tabId={id} />;
      case 'culture':
        return <CultureView />;
      case 'video':
        return <VideoView />;
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
      {renderModule()}
    </Suspense>
  );
}
