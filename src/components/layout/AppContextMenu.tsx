import { memo } from 'react';
import ContextMenu from '../modals/ContextMenu';
import type { AppState, Action, Page } from '../../types';

export interface AppContextMenuProps {
  contextMenu: NonNullable<AppState['contextMenu']>;
  pages: Page[];
  dispatch: React.Dispatch<Action>;
  handleCreatePage: (parentId: string | null) => Promise<void>;
  handleImportPage: (parentId: string | null) => Promise<void>;
  handleExportPage: (pageId: string) => Promise<void>;
  handleUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  setRenamePageId: (id: string | null) => void;
  setMovePageId: (id: string | null) => void;
}

export const AppContextMenu = memo(function AppContextMenu({
  contextMenu,
  pages,
  dispatch,
  handleCreatePage,
  handleImportPage,
  handleExportPage,
  handleUpdatePage,
  setRenamePageId,
  setMovePageId,
}: AppContextMenuProps) {
  const contextPage = pages.find((p) => p.id === contextMenu.pageId);

  return (
    <ContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      pageId={contextMenu.pageId}
      isPinned={!!contextPage?.is_pinned}
      onOpenInNewTab={(id) => {
        dispatch({ type: 'HIDE_CONTEXT_MENU' });
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
      onSharePage={(id) => {
        window.dispatchEvent(new CustomEvent('caderno-open-share-page', { detail: { pageId: id } }));
      }}
      onDelete={(id) => dispatch({ type: 'SET_CONFIRM_DELETE', pageId: id })}
      onRename={(id) => setRenamePageId(id)}
      onMovePage={(id) => setMovePageId(id)}
      onTogglePin={(id) => {
        const isPinning = !contextPage?.is_pinned;
        const maxOrder = pages
          .filter((p) => p.is_pinned)
          .reduce((max, p) => Math.max(max, p.pinned_order || 0), -1);
        handleUpdatePage(id, {
          is_pinned: isPinning ? 1 : 0,
          pinned_order: isPinning ? maxOrder + 1 : 0,
        });
      }}
      onClose={() => dispatch({ type: 'HIDE_CONTEXT_MENU' })}
    />
  );
});
