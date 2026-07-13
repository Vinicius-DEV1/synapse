import React from 'react';
import type { Tab, Page } from '../types';

import PageView from './PageView';
import FinanceView from './finance/FinanceView';
import LibraryView from './library/LibraryView';
import CultureView from './culture/CultureView';
import VideoView from './video-player/VideoView';
import AnkiView from './anki/AnkiView';
import FocusApp from './focus/FocusApp';
import CalendarView from './calendar/CalendarView';

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
    case 'finance':
    default:
      return <FinanceView />;
  }
}
