import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import type { Page } from '../types';
import Editor from './Editor';
import SubPageGrid from './SubPageGrid';
import EmptyState from './EmptyState';
import { ChevronRight, Clock } from 'lucide-react';
import EmojiPopover from './EmojiPopover';
import PageHistoryModal from './PageHistoryModal';

interface PageViewProps {
  page: Page | null;
  onUpdateContent: (id: string, content: string, embeddedSaves?: {id: string, content: string}[]) => Promise<void>;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onCreateLinkedPage: (title: string, parentId: string | null) => Promise<string>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

export default function PageView({ page, onUpdateContent, onCreatePage, onCreateLinkedPage, onUpdatePage }: PageViewProps) {
  const { state, dispatch } = useStore();
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Build breadcrumb path
  const breadcrumbs = useMemo(() => {
    if (!page) return [];
    const path: Page[] = [];
    let current: Page | undefined = page;
    while (current) {
      path.unshift(current);
      current = current.parent_id
        ? state.pages.find((p) => p.id === current!.parent_id)
        : undefined;
    }
    return path;
  }, [page, state.pages]);

  const childPages = useMemo(() => {
    if (!page) return [];
    return state.pages
      .filter((p) => p.parent_id === page.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [page, state.pages]);

  if (!page) {
    return <EmptyState onCreatePage={() => onCreatePage(null)} />;
  }

  const handleNavigate = (pageId: string) => {
    dispatch({ type: 'NAVIGATE_IN_TAB', pageId });
  };

  return (
    <div className="h-full overflow-y-auto" id="page-view-scroll">
      <div className="max-w-5xl mx-auto px-12 py-8 animate-fade-in">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-dark-subtext mb-4 flex-wrap">
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

        {/* Page Icon & Title */}
        <div className="flex items-start gap-3 mb-6 group">
          <EmojiPopover onEmojiSelect={(emoji) => onUpdatePage(page.id, { icon: emoji })}>
            <span className="text-4xl">{page.icon}</span>
          </EmojiPopover>
          <div className="flex-1 min-w-0 flex items-start justify-between">
            <h1
              contentEditable
              suppressContentEditableWarning
              className="text-3xl font-bold text-dark-text outline-none flex-1 min-w-0 leading-tight"
              onBlur={(e) => {
                const newTitle = e.currentTarget.textContent?.trim();
                if (newTitle && newTitle !== page.title) {
                  onUpdatePage(page.id, { title: newTitle });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLElement).blur();
                }
              }}
            >
              {page.title}
            </h1>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10 rounded-lg flex items-center gap-2 text-sm ml-4 whitespace-nowrap"
              title="Histórico de Edições"
            >
              <Clock size={16} />
              <span className="hidden sm:inline font-medium">Histórico</span>
            </button>
          </div>
        </div>

        {/* Sub-Pages Grid */}
        {childPages.length > 0 && (
          <SubPageGrid
            pages={childPages}
            onNavigate={handleNavigate}
            onCreatePage={() => onCreatePage(page.id)}
          />
        )}

        {/* Editor */}
        <Editor
          pageId={page.id}
          initialContent={page.content}
          onSave={(content, embeddedSaves) => onUpdateContent(page.id, content, embeddedSaves)}
          onCreateLinkedPage={(title) => onCreateLinkedPage(title, page.id)}
        />

        {showHistoryModal && (
          <PageHistoryModal pageId={page.id} onClose={() => setShowHistoryModal(false)} />
        )}
      </div>
    </div>
  );
}
