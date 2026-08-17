import { Search, StickyNote, Trash2 } from 'lucide-react';
import type { LibraryHighlight } from '../../../types';
import { AnnotationItem } from './AnnotationItem';

interface AnnotationsTabProps {
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
}

export function AnnotationsTab({
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
}: AnnotationsTabProps) {
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
