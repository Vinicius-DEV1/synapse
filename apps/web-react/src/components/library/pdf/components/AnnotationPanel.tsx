import { useState, useMemo, useCallback } from 'react';
import { StickyNote, Bookmark, List, X } from 'lucide-react';
import type { LibraryHighlight, LibraryBookmark } from '../../../../types';
import { AnnotationsTab } from '../../ui/AnnotationsTab';
import { BookmarksTab } from '../../ui/BookmarksTab';
import { TocTab, flattenTocPages } from '../../ui/TocTab';
import type { TocItem } from '../../ui/TocTab';

export interface AnnotationPanelProps {
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
            bookmarks={bookmarks}
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

export type { TocItem };
