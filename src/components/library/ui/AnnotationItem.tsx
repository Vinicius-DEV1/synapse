import React from 'react';
import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import type { LibraryHighlight } from '../../../types';

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#fbbf24',
  green: '#34d399',
  blue: '#60a5fa',
  pink: '#f472b6',
  orange: '#fb923c',
};

interface AnnotationItemProps {
  highlight: LibraryHighlight;
  isExpanded: boolean;
  isEditingNote: boolean;
  editingNoteText: string;
  onToggleExpand: (id: string) => void;
  onStartEditNote: (h: LibraryHighlight) => void;
  onSaveNote: (id: string) => void;
  onEditNoteTextChange: (text: string) => void;
  onCancelEditNote: () => void;
  onDelete: (id: string) => void;
  onNavigate: (page: number) => void;
}

export const AnnotationItem = React.memo(({
  highlight: h,
  isExpanded,
  isEditingNote,
  editingNoteText,
  onToggleExpand,
  onStartEditNote,
  onSaveNote,
  onEditNoteTextChange,
  onCancelEditNote,
  onDelete,
  onNavigate
}: AnnotationItemProps) => {
  return (
    <div className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-lg px-3 py-2 transition-colors">
      <div className="flex items-start gap-2">
        {/* Color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: HIGHLIGHT_COLOR_MAP[h.color] || '#fbbf24' }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs text-dark-text/90 leading-relaxed cursor-pointer ${
              isExpanded ? '' : 'line-clamp-3'
            }`}
            onClick={() => onToggleExpand(h.id)}
          >
            "{h.text_content}"
          </p>

          {/* Note */}
          {isEditingNote ? (
            <div className="mt-1.5 flex items-center gap-1">
              <input
                type="text"
                value={editingNoteText}
                onChange={(e) => onEditNoteTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveNote(h.id);
                  if (e.key === 'Escape') onCancelEditNote();
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-dark-text focus:outline-none focus:border-brand-500/50"
                placeholder="Adicionar nota..."
                autoFocus
              />
              <button
                onClick={() => onSaveNote(h.id)}
                className="px-1.5 py-1 text-[10px] bg-brand-500 text-white rounded font-medium hover:bg-brand-600 transition-colors"
              >
                OK
              </button>
            </div>
          ) : h.note ? (
            <p className="text-[11px] text-brand-300/70 italic mt-1 leading-relaxed">
              📝 {h.note}
            </p>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
        <button
          onClick={() => onStartEditNote(h)}
          className="p-1 rounded text-dark-subtext/50 hover:text-brand-400 hover:bg-white/5 transition-all"
          title="Editar nota"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={() => onDelete(h.id)}
          className="p-1 rounded text-dark-subtext/50 hover:text-red-400 hover:bg-white/5 transition-all"
          title="Excluir destaque"
        >
          <Trash2 size={11} />
        </button>
        <button
          onClick={() => onNavigate(h.page_number)}
          className="p-1 rounded text-dark-subtext/50 hover:text-brand-400 hover:bg-white/5 transition-all"
          title="Ir para página"
        >
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
});
AnnotationItem.displayName = 'AnnotationItem';
