import { useState, useMemo, useCallback } from 'react';
import {
  StickyNote, Bookmark, List, X, Pencil, Trash2,
  ArrowRight, Search, ChevronRight, BookOpen
} from 'lucide-react';
import type { LibraryHighlight, LibraryBookmark } from '../../types';
import { AnnotationItem } from './ui/AnnotationItem';

interface TocItem {
  title: string;
  pageNumber: number;
  level: number;
  children?: TocItem[];
}

interface AnnotationPanelProps {
  bookId: string;
  highlights: LibraryHighlight[];
  bookmarks: LibraryBookmark[];
  tocItems: TocItem[];
  currentPage: number;
  onNavigateToPage: (page: number) => void;
  onUpdateHighlight: (id: string, updates: Partial<LibraryHighlight>) => void;
  onDeleteHighlight: (id: string) => void;
  onUpdateBookmark: (id: string, label: string) => void;
  onDeleteBookmark: (id: string) => void;
  onClose: () => void;
}

type TabType = 'annotations' | 'bookmarks' | 'toc';

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#fbbf24',
  green: '#34d399',
  blue: '#60a5fa',
  pink: '#f472b6',
  orange: '#fb923c',
};

export default function AnnotationPanel({
  bookId: _bookId,
  highlights,
  bookmarks,
  tocItems,
  currentPage,
  onNavigateToPage,
  onUpdateHighlight,
  onDeleteHighlight,
  onUpdateBookmark,
  onDeleteBookmark,
  onClose,
}: AnnotationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('annotations');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedHighlights, setExpandedHighlights] = useState<Set<string>>(new Set());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editingBookmarkLabel, setEditingBookmarkLabel] = useState('');
  const [expandedTocItems, setExpandedTocItems] = useState<Set<string>>(new Set());

  const tabs: { key: TabType; label: string; icon: typeof StickyNote }[] = [
    { key: 'annotations', label: 'Anotações', icon: StickyNote },
    { key: 'bookmarks', label: 'Marcadores', icon: Bookmark },
    { key: 'toc', label: 'Sumário', icon: List },
  ];

  // Filtered and grouped highlights
  const filteredHighlights = useMemo(() => {
    let filtered = highlights;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = highlights.filter(
        h => h.text_content.toLowerCase().includes(q) ||
             (h.note && h.note.toLowerCase().includes(q))
      );
    }
    return filtered.sort((a, b) => a.page_number - b.page_number);
  }, [highlights, searchQuery]);

  const groupedHighlights = useMemo(() => {
    const groups: Map<number, LibraryHighlight[]> = new Map();
    for (const h of filteredHighlights) {
      if (!groups.has(h.page_number)) {
        groups.set(h.page_number, []);
      }
      groups.get(h.page_number)!.push(h);
    }
    return groups;
  }, [filteredHighlights]);

  const sortedBookmarks = useMemo(() => {
    return [...bookmarks].sort((a, b) => a.page_number - b.page_number);
  }, [bookmarks]);

  // Toggle highlight expanded
  const toggleHighlightExpand = useCallback((id: string) => {
    setExpandedHighlights(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Start editing note
  const startEditNote = useCallback((h: LibraryHighlight) => {
    setEditingNoteId(h.id);
    setEditingNoteText(h.note || '');
  }, []);

  const saveNote = useCallback((id: string) => {
    onUpdateHighlight(id, { note: editingNoteText });
    setEditingNoteId(null);
    setEditingNoteText('');
  }, [editingNoteText, onUpdateHighlight]);

  // Start editing bookmark
  const startEditBookmark = useCallback((b: LibraryBookmark) => {
    setEditingBookmarkId(b.id);
    setEditingBookmarkLabel(b.label || '');
  }, []);

  const saveBookmarkLabel = useCallback((id: string) => {
    onUpdateBookmark(id, editingBookmarkLabel);
    setEditingBookmarkId(null);
    setEditingBookmarkLabel('');
  }, [editingBookmarkLabel, onUpdateBookmark]);

  // Find current chapter from TOC
  const currentChapterPage = useMemo(() => {
    const flatPages = flattenTocPages(tocItems);
    let current = 0;
    for (const p of flatPages) {
      if (p <= currentPage) current = p;
      else break;
    }
    return current;
  }, [tocItems, currentPage]);

  return (
    <div
      className="w-80 h-full bg-dark-bg/95 backdrop-blur-md border-l border-white/5 flex flex-col overflow-hidden"
      style={{ animation: 'slide-in-right 0.25s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-dark-text">Painel</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-dark-subtext hover:bg-white/10 hover:text-dark-text transition-all active:scale-90"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-all ${
              activeTab === key
                ? 'text-brand-400 border-b-2 border-brand-400 bg-brand-500/5'
                : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'annotations' && (
          <AnnotationsTab
            groupedHighlights={groupedHighlights}
            expandedHighlights={expandedHighlights}
            searchQuery={searchQuery}
            editingNoteId={editingNoteId}
            editingNoteText={editingNoteText}
            totalCount={filteredHighlights.length}
            onSearchChange={setSearchQuery}
            onToggleExpand={toggleHighlightExpand}
            onStartEditNote={startEditNote}
            onSaveNote={saveNote}
            onEditNoteTextChange={setEditingNoteText}
            onCancelEditNote={() => setEditingNoteId(null)}
            onDelete={onDeleteHighlight}
            onNavigate={onNavigateToPage}
          />
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksTab
            bookmarks={sortedBookmarks}
            currentPage={currentPage}
            editingBookmarkId={editingBookmarkId}
            editingBookmarkLabel={editingBookmarkLabel}
            onStartEdit={startEditBookmark}
            onSaveLabel={saveBookmarkLabel}
            onEditLabelChange={setEditingBookmarkLabel}
            onCancelEdit={() => setEditingBookmarkId(null)}
            onDelete={onDeleteBookmark}
            onNavigate={onNavigateToPage}
          />
        )}

        {activeTab === 'toc' && (
          <TocTab
            tocItems={tocItems}
            currentChapterPage={currentChapterPage}
            expandedItems={expandedTocItems}
            onToggleExpand={(key) => {
              setExpandedTocItems(prev => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              });
            }}
            onNavigate={onNavigateToPage}
          />
        )}
      </div>
    </div>
  );
}

/* ============ Annotations Tab ============ */

function AnnotationsTab({
  groupedHighlights,
  expandedHighlights,
  searchQuery,
  editingNoteId,
  editingNoteText,
  totalCount,
  onSearchChange,
  onToggleExpand,
  onStartEditNote,
  onSaveNote,
  onEditNoteTextChange,
  onCancelEditNote,
  onDelete,
  onNavigate,
}: {
  groupedHighlights: Map<number, LibraryHighlight[]>;
  expandedHighlights: Set<string>;
  searchQuery: string;
  editingNoteId: string | null;
  editingNoteText: string;
  totalCount: number;
  onSearchChange: (q: string) => void;
  onToggleExpand: (id: string) => void;
  onStartEditNote: (h: LibraryHighlight) => void;
  onSaveNote: (id: string) => void;
  onEditNoteTextChange: (text: string) => void;
  onCancelEditNote: () => void;
  onDelete: (id: string) => void;
  onNavigate: (page: number) => void;
}) {
  const handleRestorePdf = () => {
    if (confirm('Tem certeza de que deseja apagar TODAS as anotações deste PDF? Isso restaurará o PDF ao seu estado original.')) {
      groupedHighlights.forEach(items => {
        items.forEach(h => onDelete(h.id));
      });
    }
  };

  return (
    <div className="p-3 flex flex-col h-full space-y-3">
      {/* Search */}
      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-brand-500/50 transition-colors shrink-0">
        <Search size={13} className="text-dark-subtext mr-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar anotações..."
          className="flex-1 bg-transparent text-xs text-dark-text placeholder:text-dark-subtext/50 focus:outline-none"
        />
      </div>

      {/* Grouped highlights */}
      {groupedHighlights.size === 0 ? (
        <div className="text-center py-8">
          <StickyNote size={28} className="text-dark-subtext/30 mx-auto mb-2" />
          <p className="text-xs text-dark-subtext/60">
            {searchQuery ? 'Nenhuma anotação encontrada' : 'Nenhuma anotação ainda'}
          </p>
          {!searchQuery && (
            <p className="text-[10px] text-dark-subtext/40 mt-1">
              Selecione texto no PDF para destacar
            </p>
          )}
        </div>
      ) : (
        <>
          {Array.from(groupedHighlights.entries()).map(([pageNum, items]) => (
            <div key={pageNum} className="space-y-1.5">
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[10px] font-bold text-dark-subtext/60 uppercase tracking-wider">
                  Página {pageNum}
                </span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {items.map((h) => {
                const isExpanded = expandedHighlights.has(h.id);
                const isEditingNote = editingNoteId === h.id;

                return (
                  <AnnotationItem
                    key={h.id}
                    highlight={h}
                    isExpanded={isExpanded}
                    isEditingNote={isEditingNote}
                    editingNoteText={editingNoteText}
                    onToggleExpand={onToggleExpand}
                    onStartEditNote={onStartEditNote}
                    onSaveNote={onSaveNote}
                    onEditNoteTextChange={onEditNoteTextChange}
                    onCancelEditNote={onCancelEditNote}
                    onDelete={onDelete}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          ))}

          {/* Total count */}
          <div className="text-center pt-2 pb-1 shrink-0">
            <span className="text-[10px] text-dark-subtext/40">
              {totalCount} {totalCount === 1 ? 'destaque' : 'destaques'}
            </span>
          </div>

          <div className="mt-auto pt-4 shrink-0">
            <button
              onClick={handleRestorePdf}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} />
              Restaurar PDF (Apagar Tudo)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ============ Bookmarks Tab ============ */

function BookmarksTab({
  bookmarks,
  currentPage,
  editingBookmarkId,
  editingBookmarkLabel,
  onStartEdit,
  onSaveLabel,
  onEditLabelChange,
  onCancelEdit,
  onDelete,
  onNavigate,
}: {
  bookmarks: LibraryBookmark[];
  currentPage: number;
  editingBookmarkId: string | null;
  editingBookmarkLabel: string;
  onStartEdit: (b: LibraryBookmark) => void;
  onSaveLabel: (id: string) => void;
  onEditLabelChange: (text: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onNavigate: (page: number) => void;
}) {
  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-8 px-3">
        <Bookmark size={28} className="text-dark-subtext/30 mx-auto mb-2" />
        <p className="text-xs text-dark-subtext/60">Nenhum marcador ainda</p>
        <p className="text-[10px] text-dark-subtext/40 mt-1">
          Clique na fita no canto da página ou pressione B
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1">
      {bookmarks.map((b) => {
        const isCurrent = b.page_number === currentPage;
        const isEditing = editingBookmarkId === b.id;

        return (
          <div
            key={b.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
              isCurrent
                ? 'bg-brand-500/10 border border-brand-500/20'
                : 'hover:bg-white/[0.04]'
            }`}
            onClick={() => !isEditing && onNavigate(b.page_number)}
          >
            {/* Page number badge */}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isCurrent
                ? 'bg-brand-500/20 text-brand-400'
                : 'bg-white/5 text-dark-subtext'
            }`}>
              {b.page_number}
            </span>

            {/* Label */}
            {isEditing ? (
              <input
                type="text"
                value={editingBookmarkLabel}
                onChange={(e) => onEditLabelChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveLabel(b.id);
                  if (e.key === 'Escape') onCancelEdit();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-dark-text focus:outline-none focus:border-brand-500/50"
                placeholder="Rótulo..."
                autoFocus
              />
            ) : (
              <span className="flex-1 text-xs text-dark-text/80 truncate">
                {b.label || `Página ${b.page_number}`}
              </span>
            )}

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onStartEdit(b); }}
                className="p-1 rounded text-dark-subtext/50 hover:text-brand-400 hover:bg-white/5 transition-all"
                title="Editar rótulo"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}
                className="p-1 rounded text-dark-subtext/50 hover:text-red-400 hover:bg-white/5 transition-all"
                title="Excluir marcador"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============ TOC Tab ============ */

function TocTab({
  tocItems,
  currentChapterPage,
  expandedItems,
  onToggleExpand,
  onNavigate,
}: {
  tocItems: TocItem[];
  currentChapterPage: number;
  expandedItems: Set<string>;
  onToggleExpand: (key: string) => void;
  onNavigate: (page: number) => void;
}) {
  if (tocItems.length === 0) {
    return (
      <div className="text-center py-8 px-3">
        <BookOpen size={28} className="text-dark-subtext/30 mx-auto mb-2" />
        <p className="text-xs text-dark-subtext/60">
          Este PDF não possui sumário embutido
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <TocItemList
        items={tocItems}
        currentChapterPage={currentChapterPage}
        expandedItems={expandedItems}
        onToggleExpand={onToggleExpand}
        onNavigate={onNavigate}
        depth={0}
      />
    </div>
  );
}

function TocItemList({
  items,
  currentChapterPage,
  expandedItems,
  onToggleExpand,
  onNavigate,
  depth,
}: {
  items: TocItem[];
  currentChapterPage: number;
  expandedItems: Set<string>;
  onToggleExpand: (key: string) => void;
  onNavigate: (page: number) => void;
  depth: number;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item, idx) => {
        const key = `${depth}-${idx}-${item.pageNumber}`;
        const isCurrent = item.pageNumber === currentChapterPage;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.has(key);

        return (
          <div key={key}>
            <div
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${
                isCurrent
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'hover:bg-white/[0.04] text-dark-text/80'
              }`}
              style={{ paddingLeft: `${8 + depth * 16}px` }}
              onClick={() => onNavigate(item.pageNumber)}
            >
              {hasChildren && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(key); }}
                  className="p-0.5 rounded hover:bg-white/10 transition-all"
                >
                  <ChevronRight
                    size={12}
                    className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  />
                </button>
              )}
              {!hasChildren && <div className="w-4" />}

              <span className="flex-1 text-xs truncate">{item.title}</span>
              <span className="text-[10px] text-dark-subtext/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.pageNumber}
              </span>
            </div>

            {hasChildren && isExpanded && (
              <TocItemList
                items={item.children!}
                currentChapterPage={currentChapterPage}
                expandedItems={expandedItems}
                onToggleExpand={onToggleExpand}
                onNavigate={onNavigate}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============ Helpers ============ */

function flattenTocPages(items: TocItem[]): number[] {
  const pages: number[] = [];
  for (const item of items) {
    pages.push(item.pageNumber);
    if (item.children) {
      pages.push(...flattenTocPages(item.children));
    }
  }
  return pages.sort((a, b) => a - b);
}

export type { TocItem, AnnotationPanelProps };
