import { useMemo } from 'react';
import { ChevronRight, Clock, FolderInput } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Page } from '../../types';
import { getPagePath } from '../../utils/hierarchy';
import EmojiPopover from '../EmojiPopover';

interface PageHeaderProps {
  page: Page;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  onShowHistory: () => void;
}

export function PageHeader({ page, onUpdatePage, onShowHistory }: PageHeaderProps) {
  const { state, dispatch } = useStore();

  const breadcrumbs = useMemo(() => {
    if (!page) return [];
    return getPagePath(state.pages, page.id) as Page[];
  }, [page, state.pages]);

  const handleNavigate = (pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
  };

  const handleContextMenu = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({
      type: 'SHOW_CONTEXT_MENU',
      x: e.clientX,
      y: e.clientY,
      pageId,
    });
  };

  const handleAuxClick = (e: React.MouseEvent, pageId: string) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      const tabId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      dispatch({
        type: 'ADD_TAB',
        tab: {
          id: tabId,
          module: 'notes',
          pageId,
          unsavedContent: null,
          scrollY: 0,
        },
      });
    }
  };

  return (
    <>
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-1 text-xs text-dark-subtext mb-6 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-dark-subtext/50" />}
              <button
                onClick={() => handleNavigate(crumb.id)}
                onContextMenu={(e) => handleContextMenu(e, crumb.id)}
                onAuxClick={(e) => handleAuxClick(e, crumb.id)}
                className={`hover:text-brand-400 transition-colors ${
                  i === breadcrumbs.length - 1 ? 'text-dark-text font-medium' : ''
                }`}
              >
                {crumb.icon} {crumb.title}
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-start gap-3 mb-2 group">
        <EmojiPopover onEmojiSelect={(emoji) => onUpdatePage(page.id, { icon: emoji })}>
          <button className="text-5xl hover:bg-white/5 p-2 -ml-2 rounded-xl transition-colors">{page.icon}</button>
        </EmojiPopover>
        <div className="flex-1 min-w-0 flex items-start justify-between pt-2">
          <h1
            contentEditable
            suppressContentEditableWarning
            className="text-4xl font-bold text-dark-text outline-none flex-1 min-w-0 leading-tight empty:before:content-['Sem_Título'] empty:before:text-dark-subtext/50"
            onBlur={(e) => {
              const newTitle = e.currentTarget.textContent?.trim();
              if (newTitle !== undefined && newTitle !== page.title) {
                onUpdatePage(page.id, { title: newTitle || 'Sem Título' });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                (e.target as HTMLElement).blur();
              }
            }}
          >
            {page.title === 'Sem Título' ? '' : page.title}
          </h1>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('caderno-open-move-page', { detail: { pageId: page.id } }));
              }}
              className="p-2 text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 rounded-lg flex items-center gap-1.5 text-sm whitespace-nowrap"
              title="Mover Página para outro local..."
            >
              <FolderInput size={16} />
              <span className="hidden sm:inline font-medium">Mover</span>
            </button>

            <button
              onClick={onShowHistory}
              className="p-2 text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 rounded-lg flex items-center gap-1.5 text-sm whitespace-nowrap"
              title="Histórico de Edições"
            >
              <Clock size={16} />
              <span className="hidden sm:inline font-medium">Histórico</span>
            </button>
          </div>
        </div>
      </div>

      <div className="ml-14 mb-8">
        <p
          contentEditable
          suppressContentEditableWarning
          className="text-base text-dark-subtext outline-none empty:before:content-['Adicionar_descrição...'] empty:before:text-dark-subtext/30 focus:empty:before:text-dark-subtext/50 transition-colors"
          onBlur={(e) => {
            const newDesc = e.currentTarget.textContent?.trim();
            if (newDesc !== undefined && newDesc !== (page.description || '')) {
              onUpdatePage(page.id, { description: newDesc });
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLElement).blur();
            }
          }}
        >
          {page.description || ''}
        </p>
      </div>
    </>
  );
}
