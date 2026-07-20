import { useMemo } from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import type { Page } from '../../../types';
import EmojiPopover from '../../EmojiPopover';

interface PageHeaderProps {
  page: Page;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  onShowHistory: () => void;
}

export function PageHeader({ page, onUpdatePage, onShowHistory }: PageHeaderProps) {
  const { state, dispatch } = useStore();

  const breadcrumbs = useMemo(() => {
    if (!page) return [];
    const path: Page[] = [];
    let current: Page | undefined = page;
    while (current) {
      path.unshift(current);
      current = current.parent_id
        ? state.pages.find((p: Page) => p.id === current!.parent_id)
        : undefined;
    }
    return path;
  }, [page, state.pages]);

  const handleNavigate = (pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
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
          <button
            onClick={onShowHistory}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 rounded-lg flex items-center gap-2 text-sm ml-4 whitespace-nowrap"
            title="Histórico de Edições"
          >
            <Clock size={16} />
            <span className="hidden sm:inline font-medium">Histórico</span>
          </button>
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
