import { Bookmark, Pencil, Trash2 } from 'lucide-react';
import type { LibraryBookmark } from '../../../types';

interface BookmarksTabProps {
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
}

export function BookmarksTab({
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
}: BookmarksTabProps) {
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
